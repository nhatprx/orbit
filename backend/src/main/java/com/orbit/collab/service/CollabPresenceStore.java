package com.orbit.collab.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.collab.dto.CollabParticipantDto;
import com.orbit.collab.dto.CollabRoomEvent;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class CollabPresenceStore {
    private static final Duration ROOM_TTL = Duration.ofSeconds(75);
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final ConcurrentHashMap<String, Set<String>> roomsBySession = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, CollabParticipantDto>> localRooms =
        new ConcurrentHashMap<>();

    public CollabPresenceStore(StringRedisTemplate redis, ObjectMapper mapper) {
        this.redis = redis;
        this.mapper = mapper;
    }

    public List<CollabParticipantDto> update(
        String kind, UUID resourceId, UUID userId, String sessionId, String name, JsonNode cursor
    ) {
        String key = roomKey(kind, resourceId);
        roomsBySession.computeIfAbsent(sessionId, ignored -> ConcurrentHashMap.newKeySet()).add(key);
        try {
            CollabParticipantDto participant = new CollabParticipantDto(
                userId, sessionId, name, color(userId), cursor, Instant.now()
            );
            try {
                redis.opsForHash().put(key, sessionId, mapper.writeValueAsString(participant));
                redis.expire(key, ROOM_TTL);
            } catch (RuntimeException ex) {
                localRooms.computeIfAbsent(key, ignored -> new ConcurrentHashMap<>()).put(sessionId, participant);
            }
            return participants(key);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not update collaboration presence.", ex);
        }
    }

    public List<CollabParticipantDto> remove(String kind, UUID resourceId, String sessionId) {
        String key = roomKey(kind, resourceId);
        try { redis.opsForHash().delete(key, sessionId); } catch (RuntimeException ignored) { }
        ConcurrentHashMap<String, CollabParticipantDto> local = localRooms.get(key);
        if (local != null) local.remove(sessionId);
        Set<String> rooms = roomsBySession.get(sessionId);
        if (rooms != null) {
            rooms.remove(key);
            if (rooms.isEmpty()) roomsBySession.remove(sessionId, rooms);
        }
        return participants(key);
    }

    public List<CollabRoomEvent> disconnect(String sessionId) {
        Set<String> rooms = roomsBySession.remove(sessionId);
        if (rooms == null) return List.of();
        List<CollabRoomEvent> events = new ArrayList<>();
        for (String key : rooms) {
            try { redis.opsForHash().delete(key, sessionId); } catch (RuntimeException ignored) { }
            ConcurrentHashMap<String, CollabParticipantDto> local = localRooms.get(key);
            if (local != null) local.remove(sessionId);
            String[] parts = key.split(":");
            String kind = parts[3];
            UUID resourceId = UUID.fromString(parts[4]);
            events.add(new CollabRoomEvent("PRESENCE_SYNC", kind.toUpperCase(), resourceId,
                null, sessionId, null, 0, Instant.now(), participants(key), null));
        }
        return events;
    }

    private List<CollabParticipantDto> participants(String key) {
        Instant cutoff = Instant.now().minus(ROOM_TTL);
        List<CollabParticipantDto> result = new ArrayList<>();
        try {
            redis.opsForHash().entries(key).forEach((field, raw) -> {
                try {
                    CollabParticipantDto dto = mapper.readValue(raw.toString(), CollabParticipantDto.class);
                    if (dto.updatedAt() != null && dto.updatedAt().isAfter(cutoff)) result.add(dto);
                    else redis.opsForHash().delete(key, field);
                } catch (Exception ex) { redis.opsForHash().delete(key, field); }
            });
            return result;
        } catch (RuntimeException ex) {
            ConcurrentHashMap<String, CollabParticipantDto> local = localRooms.get(key);
            if (local == null) return List.of();
            local.values().removeIf(item -> item.updatedAt() == null || !item.updatedAt().isAfter(cutoff));
            return List.copyOf(local.values());
        }
    }

    private static String roomKey(String kind, UUID id) { return "orbit:collab:presence:" + kind + ":" + id; }
    private static String color(UUID userId) {
        String[] palette = {"#22C55E", "#38BDF8", "#F59E0B", "#60A5FA", "#A3E635", "#2DD4BF"};
        return palette[Math.floorMod(userId.hashCode(), palette.length)];
    }
}
