package com.orbit.chat.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.service.ChatBroadcaster;
import com.orbit.chat.service.ChatBroadcasters;
import com.orbit.chat.service.ChatRateLimiter;
import com.orbit.chat.service.ChatRelay;
import com.orbit.chat.service.VoicePresenceStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Chooses the broadcaster, limiter, and voice presence store for the current runtime:
 * Redis-backed when enabled, local/in-memory or no-op otherwise.
 */
@Configuration
public class ChatRuntimeConfig {

    @Bean
    ChatBroadcaster chatBroadcaster(
        ObjectProvider<ChatRelay> relay,
        ObjectProvider<StringRedisTemplate> redis,
        ObjectMapper mapper,
        @Value("${orbit.chat.redis.enabled:true}") boolean redisEnabled
    ) {
        return ChatBroadcasters.create(relay.getIfAvailable(), redis.getIfAvailable(), mapper, redisEnabled);
    }

    @Bean
    ChatRateLimiter chatRateLimiter(
        ObjectProvider<StringRedisTemplate> redis,
        @Value("${orbit.chat.redis.enabled:true}") boolean redisEnabled
    ) {
        return ChatBroadcasters.rateLimiter(redis.getIfAvailable(), redisEnabled);
    }

    @Bean
    VoicePresenceStore voicePresenceStore(
        ObjectProvider<StringRedisTemplate> redis,
        ObjectMapper mapper,
        @Value("${orbit.chat.redis.enabled:true}") boolean redisEnabled
    ) {
        return ChatBroadcasters.voicePresenceStore(redis.getIfAvailable(), mapper, redisEnabled);
    }
}
