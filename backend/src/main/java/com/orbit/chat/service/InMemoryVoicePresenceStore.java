package com.orbit.chat.service;

import com.orbit.chat.dto.VoiceParticipantDto;
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
import java.util.concurrent.ConcurrentHashMap;

/** Thread-safe in-memory voice presence store used when Redis is disabled or unavailable. */
public class InMemoryVoicePresenceStore implements VoicePresenceStore {

    static final Duration DEFAULT_TTL = Duration.ofMinutes(5);

    private record Entry(VoiceParticipantDto participant, long expiresAtMs) {}

    private final ConcurrentHashMap<UUID, Map<UUID, Entry>> rooms = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, ScopeKey> channelScopes = new ConcurrentHashMap<>();
    private final Duration ttl;
    private final Clock clock;

    public InMemoryVoicePresenceStore() {
        this(DEFAULT_TTL, Clock.systemUTC());
    }

    public InMemoryVoicePresenceStore(Duration ttl, Clock clock) {
        this.ttl = ttl;
        this.clock = clock;
    }

    @Override
    public int participantCount(UUID channelId) {
        return list(channelId).size();
    }

    @Override
    public List<VoiceParticipantDto> list(UUID channelId) {
        Map<UUID, Entry> room = rooms.get(channelId);
        if (room == null || room.isEmpty()) return List.of();
        long now = clock.millis();
        List<VoiceParticipantDto> active = new ArrayList<>();
        for (Map.Entry<UUID, Entry> item : room.entrySet()) {
            if (item.getValue().expiresAtMs() <= now) {
                room.remove(item.getKey(), item.getValue());
            } else {
                active.add(item.getValue().participant());
            }
        }
        if (room.isEmpty()) rooms.remove(channelId, room);
        active.sort(Comparator.comparing(VoiceParticipantDto::joinedAt).thenComparing(VoiceParticipantDto::userId));
        return active;
    }

    @Override
    public VoiceParticipantDto get(UUID channelId, UUID userId) {
        Map<UUID, Entry> room = rooms.get(channelId);
        if (room == null) return null;
        Entry entry = room.get(userId);
        if (entry == null) return null;
        if (entry.expiresAtMs() <= clock.millis()) {
            room.remove(userId, entry);
            if (room.isEmpty()) rooms.remove(channelId, room);
            return null;
        }
        return entry.participant();
    }

    @Override
    public void put(UUID channelId, ScopeKey scope, VoiceParticipantDto participant) {
        if (scope != null) channelScopes.put(channelId, scope);
        Map<UUID, Entry> room = rooms.computeIfAbsent(channelId, id -> new ConcurrentHashMap<>());
        room.put(participant.userId(), new Entry(participant, clock.millis() + ttl.toMillis()));
    }

    @Override
    public boolean refresh(UUID channelId, UUID userId) {
        VoiceParticipantDto current = get(channelId, userId);
        if (current == null) return false;
        Map<UUID, Entry> room = rooms.get(channelId);
        if (room == null) return false;
        room.put(userId, new Entry(current, clock.millis() + ttl.toMillis()));
        return true;
    }

    @Override
    public VoiceParticipantDto remove(UUID channelId, UUID userId) {
        Map<UUID, Entry> room = rooms.get(channelId);
        if (room == null) return null;
        Entry removed = room.remove(userId);
        if (room.isEmpty()) rooms.remove(channelId, room);
        if (removed == null || removed.expiresAtMs() <= clock.millis()) return null;
        return removed.participant();
    }

    @Override
    public Map<UUID, VoiceParticipantDto> removeFromOtherRoomsInScope(UUID userId, UUID targetChannelId, ScopeKey scope) {
        Map<UUID, VoiceParticipantDto> removedByChannel = new HashMap<>();
        for (Map.Entry<UUID, ScopeKey> entry : channelScopes.entrySet()) {
            UUID otherId = entry.getKey();
            if (otherId.equals(targetChannelId) || !scope.equals(entry.getValue())) continue;
            VoiceParticipantDto removed = remove(otherId, userId);
            if (removed != null) removedByChannel.put(otherId, removed);
        }
        return removedByChannel;
    }

    @Override
    public Set<UUID> findChannelsForUser(UUID userId) {
        Set<UUID> result = new HashSet<>();
        long now = clock.millis();
        for (Map.Entry<UUID, Map<UUID, Entry>> roomEntry : rooms.entrySet()) {
            Entry entry = roomEntry.getValue().get(userId);
            if (entry != null && entry.expiresAtMs() > now) {
                result.add(roomEntry.getKey());
            }
        }
        return result;
    }

    @Override
    public boolean clearChannel(UUID channelId) {
        channelScopes.remove(channelId);
        Map<UUID, Entry> removed = rooms.remove(channelId);
        if (removed == null || removed.isEmpty()) return false;
        long now = clock.millis();
        return removed.values().stream().anyMatch(e -> e.expiresAtMs() > now);
    }
}
