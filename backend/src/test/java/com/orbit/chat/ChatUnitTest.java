package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.service.ChatBroadcaster;
import com.orbit.chat.service.ChatBroadcasters;
import com.orbit.chat.service.ChatRateLimiter;
import com.orbit.chat.service.ChatRelay;
import com.orbit.common.ApiException;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;

class ChatUnitTest {

    private static final UUID USER = UUID.randomUUID();

    private static ChatMessageDto sample() {
        return new ChatMessageDto(UUID.randomUUID(), UUID.randomUUID(), USER, "N", "n", "hi", Instant.now());
    }

    @Test
    void rateLimiterBlocksAfterTwentyMessagesPerWindowAndSetsExpiryOnce() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        when(ops.increment(anyString())).thenReturn(1L, 2L, 20L, 21L);
        ChatRateLimiter limiter = ChatBroadcasters.rateLimiter(redis, true);

        assertDoesNotThrow(() -> limiter.check(USER));
        assertDoesNotThrow(() -> limiter.check(USER));
        assertDoesNotThrow(() -> limiter.check(USER));
        ApiException blocked = assertThrows(ApiException.class, () -> limiter.check(USER));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, blocked.getStatus());
        assertEquals("RATE_LIMITED", blocked.getCode());
        verify(redis).expire(anyString(), any(java.time.Duration.class));
    }

    @Test
    void rateLimiterFailsOpenWhenRedisIsDown() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.opsForValue()).thenThrow(new QueryTimeoutException("redis down"));
        assertDoesNotThrow(() -> ChatBroadcasters.rateLimiter(redis, true).check(USER));
    }

    @Test
    void rateLimiterIsDisabledWithoutRedis() {
        assertDoesNotThrow(() -> ChatBroadcasters.rateLimiter(null, true).check(USER));
        assertDoesNotThrow(() -> ChatBroadcasters.rateLimiter(mock(StringRedisTemplate.class), false).check(USER));
    }

    @Test
    void broadcasterFallsBackToLocalDeliveryWhenRedisPublishFails() {
        ChatRelay relay = mock(ChatRelay.class);
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.convertAndSend(eq("orbit:chat:messages"), anyString())).thenThrow(new QueryTimeoutException("down"));
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        ChatBroadcaster broadcaster = ChatBroadcasters.create(relay, redis, mapper, true);

        ChatMessageDto message = sample();
        broadcaster.broadcast(message);

        verify(relay).deliver(message);
    }

    @Test
    void broadcasterPublishesToRedisWithoutDoubleDelivery() {
        ChatRelay relay = mock(ChatRelay.class);
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ChatBroadcaster broadcaster = ChatBroadcasters.create(
            relay, redis, new ObjectMapper().findAndRegisterModules(), true
        );

        broadcaster.broadcast(sample());

        verify(redis).convertAndSend(eq("orbit:chat:messages"), anyString());
        verify(relay, never()).deliver(any());
    }

    @Test
    void broadcasterIsLocalOnlyWhenRedisDisabledAndNoOpWithoutBroker() {
        ChatRelay relay = mock(ChatRelay.class);
        ChatMessageDto message = sample();
        ChatBroadcasters.create(relay, mock(StringRedisTemplate.class), new ObjectMapper(), false).broadcast(message);
        verify(relay).deliver(message);
        assertDoesNotThrow(() -> ChatBroadcasters.create(null, null, new ObjectMapper(), true).broadcast(message));
    }
}
