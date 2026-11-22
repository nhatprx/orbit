package com.orbit.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.ChatPresenceEvent;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class ChatPresenceStore {
    private static final Duration PRESENCE_TTL = Duration.ofSeconds(75);
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final ConcurrentHashMap<String, Set<String>> roomsBySession = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, Entry>> localRooms = new ConcurrentHashMap<>();

    public ChatPresenceStore(StringRedisTemplate redis, ObjectMapper mapper) {
        this.redis = redis;
        this.mapper = mapper;
    }

    public int touch(String scopeType, UUID scopeId, UUID userId, String sessionId) {
        String key = key(scopeType, scopeId);
        roomsBySession.computeIfAbsent(sessionId, ignored -> ConcurrentHashMap.newKeySet()).add(key);
        Entry entry = new Entry(userId.toString(), Instant.now());
        write(key, sessionId, entry);
        return count(key);
    }

    public void heartbeat(String scopeType, UUID scopeId, UUID userId, String sessionId) {
        String key = key(scopeType, scopeId);
        roomsBySession.computeIfAbsent(sessionId, ignored -> ConcurrentHashMap.newKeySet()).add(key);
        write(key, sessionId, new Entry(userId.toString(), Instant.now()));
    }

    private void write(String key, String sessionId, Entry entry) {
        try {
            redis.opsForHash().put(key, sessionId, mapper.writeValueAsString(entry));
            redis.expire(key, PRESENCE_TTL);
        } catch (Exception ex) {
            localRooms.computeIfAbsent(key, ignored -> new ConcurrentHashMap<>()).put(sessionId, entry);
        }
    }

    public int leave(String scopeType, UUID scopeId, String sessionId) {
        String key = key(scopeType, scopeId);
        removeSessionRoom(sessionId, key);
        removeEntry(key, sessionId);
        return count(key);
    }

    public List<ChatPresenceEvent> disconnect(String sessionId) {
        Set<String> rooms = roomsBySession.remove(sessionId);
        if (rooms == null) return List.of();
        List<ChatPresenceEvent> events = new ArrayList<>();
        for (String room : rooms) {
            removeEntry(room, sessionId);
            String[] parts = room.split(":");
            events.add(ChatPresenceEvent.of(parts[3], UUID.fromString(parts[4]), count(room)));
        }
        return events;
    }

    private int count(String key) {
        Instant cutoff = Instant.now().minus(PRESENCE_TTL);
        try {
            Map<Object, Object> entries = redis.opsForHash().entries(key);
            Set<String> users = ConcurrentHashMap.newKeySet();
            entries.forEach((session, raw) -> {
                Entry entry = decode(raw.toString());
                if (entry != null && entry.updatedAt() != null && entry.userId() != null
                    && entry.updatedAt().isAfter(cutoff)) users.add(entry.userId());
                else redis.opsForHash().delete(key, session);
            });
            return users.size();
        } catch (RuntimeException ex) {
            ConcurrentHashMap<String, Entry> entries = localRooms.get(key);
            if (entries == null) return 0;
            entries.values().removeIf(entry -> !entry.updatedAt().isAfter(cutoff));
            return (int) entries.values().stream().map(Entry::userId).distinct().count();
        }
    }

    private Entry decode(String raw) {
        try { return mapper.readValue(raw, Entry.class); } catch (Exception ex) { return null; }
    }

    private void removeEntry(String key, String sessionId) {
        try { redis.opsForHash().delete(key, sessionId); } catch (RuntimeException ignored) { }
        ConcurrentHashMap<String, Entry> local = localRooms.get(key);
        if (local != null) local.remove(sessionId);
    }

    private void removeSessionRoom(String sessionId, String key) {
        Set<String> rooms = roomsBySession.get(sessionId);
        if (rooms == null) return;
        rooms.remove(key);
        if (rooms.isEmpty()) roomsBySession.remove(sessionId, rooms);
    }

    private static String key(String type, UUID id) { return "orbit:chat:presence:" + type + ":" + id; }
    private record Entry(String userId, Instant updatedAt) { }
}
