package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.ChatMessageDeletedDto;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.VoiceEventDto;
import com.orbit.chat.dto.VoiceParticipantDto;
import com.orbit.chat.entity.ChatScopeType;
import com.orbit.chat.service.ChatBroadcaster;
import com.orbit.chat.service.ChatBroadcasters;
import com.orbit.chat.service.ChatRelay;
import com.orbit.chat.service.InMemoryVoicePresenceStore;
import com.orbit.chat.service.VoicePresenceStore;
import com.orbit.chat.service.VoicePresenceStore.ScopeKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.connection.DefaultMessage;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

class ChatRedisVoiceTest {

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void broadcasterAndSubscriberRouteMessagesDeletionsAndVoiceThroughRedisWithFallback() throws Exception {
        ChatRelay relay = mock(ChatRelay.class);
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ChatBroadcaster broadcaster = ChatBroadcasters.create(relay, redis, mapper, true);

        UUID channelId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();
        ChatMessageDeletedDto deleted = ChatMessageDeletedDto.of(channelId, messageId);
        VoiceEventDto voice = new VoiceEventDto(
            "PARTICIPANTS", channelId, null, null, null, null, null, null, null, null, null, List.of(), Instant.now()
        );

        broadcaster.broadcastDeletion(deleted);
        broadcaster.broadcastVoice(voice);
        verify(redis).convertAndSend(eq("orbit:chat:deletions"), anyString());
        verify(redis).convertAndSend(eq("orbit:chat:voice"), anyString());
        verify(relay, never()).deliverDeletion(any());
        verify(relay, never()).deliverVoice(any());

        // Subscriber fans each topic back out to the right ChatRelay method.
        MessageListener subscriber = ChatBroadcasters.subscriber(mapper, relay);
        ChatMessageDto chatMsg = new ChatMessageDto(messageId, channelId, UUID.randomUUID(), "A", "a", "hi", Instant.now());
        subscriber.onMessage(msg("orbit:chat:messages", mapper.writeValueAsBytes(chatMsg)), null);
        subscriber.onMessage(msg("orbit:chat:deletions", mapper.writeValueAsBytes(deleted)), null);
        subscriber.onMessage(msg("orbit:chat:voice", mapper.writeValueAsBytes(voice)), null);
        subscriber.onMessage(msg("orbit:chat:voice", "not-json".getBytes(StandardCharsets.UTF_8)), null);

        verify(relay).deliver(chatMsg);
        verify(relay).deliverDeletion(deleted);
        verify(relay).deliverVoice(voice);

        // Redis failure degrades cleanly to local ChatRelay delivery.
        when(redis.convertAndSend(eq("orbit:chat:voice"), anyString())).thenThrow(new QueryTimeoutException("down"));
        when(redis.convertAndSend(eq("orbit:chat:deletions"), anyString())).thenThrow(new QueryTimeoutException("down"));
        broadcaster.broadcastVoice(voice);
        broadcaster.broadcastDeletion(deleted);
        verify(relay, org.mockito.Mockito.times(2)).deliverVoice(voice);
        verify(relay, org.mockito.Mockito.times(2)).deliverDeletion(deleted);
    }

    @Test
    @SuppressWarnings("unchecked")
    void redisVoicePresenceStorePersistsHashesWithTtlAndFallsBackOnError() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        HashOperations<String, Object, Object> hashOps = mock(HashOperations.class);
        SetOperations<String, String> setOps = mock(SetOperations.class);
        when(redis.opsForHash()).thenReturn(hashOps);
        when(redis.opsForSet()).thenReturn(setOps);

        Map<String, Map<Object, Object>> hashes = new HashMap<>();
        when(hashOps.entries(anyString())).thenAnswer(inv -> new HashMap<>(hashes.getOrDefault(inv.getArgument(0), Map.of())));
        when(hashOps.get(anyString(), any())).thenAnswer(inv -> hashes.getOrDefault(inv.getArgument(0), Map.of()).get(inv.getArgument(1)));
        org.mockito.Mockito.doAnswer(inv -> {
            hashes.computeIfAbsent(inv.getArgument(0), k -> new HashMap<>()).put(inv.getArgument(1), inv.getArgument(2));
            return null;
        }).when(hashOps).put(anyString(), any(), any());
        when(hashOps.delete(anyString(), any())).thenAnswer(inv -> {
            Map<Object, Object> map = hashes.get(inv.getArgument(0));
            if (map != null) map.remove(inv.getArgument(1));
            return 1L;
        });

        VoicePresenceStore store = ChatBroadcasters.voicePresenceStore(redis, mapper, true);
        UUID ch1 = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        ScopeKey scope = new ScopeKey(ChatScopeType.WORKSPACE, UUID.randomUUID());
        VoiceParticipantDto alice = new VoiceParticipantDto(
            userId, "alice", "Alice", false, false, false, false, false, Instant.now()
        );

        store.put(ch1, scope, alice);
        assertEquals(1, store.participantCount(ch1));
        assertTrue(store.refresh(ch1, userId));
        verify(redis, org.mockito.Mockito.atLeastOnce()).expire(eq("orbit:chat:voice:room:" + ch1), any(Duration.class));

        when(setOps.members("orbit:chat:voice:user:" + userId)).thenReturn(Set.of(ch1.toString()));
        assertEquals(Set.of(ch1), store.findChannelsForUser(userId));

        assertEquals(alice, store.remove(ch1, userId));
        assertEquals(0, store.participantCount(ch1));

        // DataAccessException falls back to local in-memory store safely.
        when(redis.opsForHash()).thenThrow(new QueryTimeoutException("down"));
        store.put(ch1, scope, alice);
        assertEquals(1, store.participantCount(ch1));
    }

    @Test
    void inMemoryPresenceStoreExpiresStaleParticipantsAfterTtl() {
        AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-11-21T10:00:00Z"));
        Clock clock = new Clock() {
            @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(java.time.ZoneId zone) { return this; }
            @Override public Instant instant() { return now.get(); }
        };
        InMemoryVoicePresenceStore store = new InMemoryVoicePresenceStore(Duration.ofSeconds(30), clock);
        UUID chId = UUID.randomUUID();
        UUID uid = UUID.randomUUID();
        VoiceParticipantDto p = new VoiceParticipantDto(uid, "u", "User", false, false, false, false, false, now.get());

        store.put(chId, new ScopeKey(ChatScopeType.WORKSPACE, UUID.randomUUID()), p);
        assertEquals(1, store.participantCount(chId));

        now.set(now.get().plusSeconds(20));
        assertTrue(store.refresh(chId, uid));

        now.set(now.get().plusSeconds(31));
        assertNull(store.get(chId, uid));
        assertEquals(0, store.participantCount(chId));
    }

    private static DefaultMessage msg(String topic, byte[] body) {
        return new DefaultMessage(topic.getBytes(StandardCharsets.UTF_8), body);
    }
}
