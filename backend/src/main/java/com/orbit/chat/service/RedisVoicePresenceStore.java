package com.orbit.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.VoiceParticipantDto;
import com.orbit.chat.service.VoicePresenceCodec.StoredEntry;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;

/** Redis-backed voice room presence store using TTL-bound hashes for multi-instance deployments. */
class RedisVoicePresenceStore implements VoicePresenceStore {

    static final Duration DEFAULT_TTL = Duration.ofMinutes(5);
    private static final Duration SCOPE_TTL = Duration.ofHours(1);
    private static final Logger LOG = LoggerFactory.getLogger(RedisVoicePresenceStore.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final Duration ttl;
    private final Clock clock;
    private final InMemoryVoicePresenceStore fallback;

    RedisVoicePresenceStore(StringRedisTemplate redis, ObjectMapper mapper) {
        this(redis, mapper, DEFAULT_TTL, Clock.systemUTC());
    }

    RedisVoicePresenceStore(StringRedisTemplate redis, ObjectMapper mapper, Duration ttl, Clock clock) {
        this.redis = redis;
        this.mapper = mapper;
        this.ttl = ttl;
        this.clock = clock;
        this.fallback = new InMemoryVoicePresenceStore(ttl, clock);
    }

    @Override
    public int participantCount(UUID channelId) {
        return list(channelId).size();
    }

    @Override
    public List<VoiceParticipantDto> list(UUID channelId) {
        return withFallback("list", () -> {
            String key = VoicePresenceCodec.roomKey(channelId);
            Map<Object, Object> entries = redis.opsForHash().entries(key);
            if (entries.isEmpty()) return List.of();
            long now = clock.millis();
            List<VoiceParticipantDto> active = new ArrayList<>();
            List<Object> expired = new ArrayList<>();
            for (Map.Entry<Object, Object> item : entries.entrySet()) {
                StoredEntry parsed = VoicePresenceCodec.decode(mapper, item.getValue());
                if (parsed == null || parsed.expiresAtMs() <= now) expired.add(item.getKey());
                else active.add(parsed.participant());
            }
            if (!expired.isEmpty()) redis.opsForHash().delete(key, expired.toArray());
            active.sort(Comparator.comparing(VoiceParticipantDto::joinedAt).thenComparing(VoiceParticipantDto::userId));
            return active;
        }, () -> fallback.list(channelId));
    }

    @Override
    public VoiceParticipantDto get(UUID channelId, UUID userId) {
        return withFallback("get", () -> {
            String key = VoicePresenceCodec.roomKey(channelId);
            Object raw = redis.opsForHash().get(key, userId.toString());
            if (raw == null) return null;
            StoredEntry parsed = VoicePresenceCodec.decode(mapper, raw);
            if (parsed == null || parsed.expiresAtMs() <= clock.millis()) {
                redis.opsForHash().delete(key, userId.toString());
                redis.opsForSet().remove(VoicePresenceCodec.userKey(userId), channelId.toString());
                return null;
            }
            return parsed.participant();
        }, () -> fallback.get(channelId, userId));
    }

    @Override
    public void put(UUID channelId, ScopeKey scope, VoiceParticipantDto participant) {
        withFallback("put", () -> {
            String room = VoicePresenceCodec.roomKey(channelId);
            String encoded = VoicePresenceCodec.encode(mapper, participant, clock.millis() + ttl.toMillis());
            redis.opsForHash().put(room, participant.userId().toString(), encoded);
            redis.expire(room, ttl);
            if (scope != null) {
                String scopeKey = VoicePresenceCodec.scopeKey(scope);
                redis.opsForSet().add(scopeKey, channelId.toString());
                redis.expire(scopeKey, SCOPE_TTL);
            }
            String userKey = VoicePresenceCodec.userKey(participant.userId());
            redis.opsForSet().add(userKey, channelId.toString());
            redis.expire(userKey, ttl);
            return null;
        }, () -> { fallback.put(channelId, scope, participant); return null; });
    }

    @Override
    public boolean refresh(UUID channelId, UUID userId) {
        return withFallback("refresh", () -> {
            VoiceParticipantDto current = get(channelId, userId);
            if (current == null) return false;
            String room = VoicePresenceCodec.roomKey(channelId);
            String encoded = VoicePresenceCodec.encode(mapper, current, clock.millis() + ttl.toMillis());
            redis.opsForHash().put(room, userId.toString(), encoded);
            redis.expire(room, ttl);
            redis.expire(VoicePresenceCodec.userKey(userId), ttl);
            return true;
        }, () -> fallback.refresh(channelId, userId));
    }

    @Override
    public VoiceParticipantDto remove(UUID channelId, UUID userId) {
        return withFallback("remove", () -> {
            VoiceParticipantDto existing = get(channelId, userId);
            redis.opsForHash().delete(VoicePresenceCodec.roomKey(channelId), userId.toString());
            redis.opsForSet().remove(VoicePresenceCodec.userKey(userId), channelId.toString());
            return existing;
        }, () -> fallback.remove(channelId, userId));
    }

    @Override
    public Map<UUID, VoiceParticipantDto> removeFromOtherRoomsInScope(UUID userId, UUID targetChannelId, ScopeKey scope) {
        return withFallback("scopeCleanup", () -> {
            Set<String> members = redis.opsForSet().members(VoicePresenceCodec.scopeKey(scope));
            if (members == null || members.isEmpty()) return Map.of();
            Map<UUID, VoiceParticipantDto> removed = new HashMap<>();
            for (String rawId : members) {
                UUID otherId = VoicePresenceCodec.parseUuid(rawId);
                if (otherId == null || otherId.equals(targetChannelId)) continue;
                VoiceParticipantDto dto = remove(otherId, userId);
                if (dto != null) removed.put(otherId, dto);
            }
            return removed;
        }, () -> fallback.removeFromOtherRoomsInScope(userId, targetChannelId, scope));
    }

    @Override
    public Set<UUID> findChannelsForUser(UUID userId) {
        return withFallback("userChannels", () -> {
            Set<String> members = redis.opsForSet().members(VoicePresenceCodec.userKey(userId));
            if (members == null || members.isEmpty()) return Set.of();
            Set<UUID> result = new HashSet<>();
            for (String rawId : members) {
                UUID id = VoicePresenceCodec.parseUuid(rawId);
                if (id != null) result.add(id);
            }
            return result;
        }, () -> fallback.findChannelsForUser(userId));
    }

    @Override
    public boolean clearChannel(UUID channelId) {
        return withFallback("clearChannel", () -> {
            List<VoiceParticipantDto> existing = list(channelId);
            redis.delete(VoicePresenceCodec.roomKey(channelId));
            for (VoiceParticipantDto p : existing) {
                redis.opsForSet().remove(VoicePresenceCodec.userKey(p.userId()), channelId.toString());
            }
            return !existing.isEmpty();
        }, () -> fallback.clearChannel(channelId));
    }

    private <T> T withFallback(String op, Supplier<T> action, Supplier<T> backup) {
        try {
            return action.get();
        } catch (DataAccessException | IllegalStateException ex) {
            LOG.warn("Redis voice {} failed, falling back locally: {}", op, ex.getMessage());
            return backup.get();
        }
    }
}
