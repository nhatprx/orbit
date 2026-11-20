package com.orbit.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;

/** Factory kept in this package so the package-private implementations stay encapsulated. */
public final class ChatBroadcasters {

    private ChatBroadcasters() {}

    public static ChatBroadcaster create(
        ChatRelay relay, StringRedisTemplate redis, ObjectMapper mapper, boolean redisEnabled
    ) {
        if (relay == null) {
            return message -> { };
        }
        if (!redisEnabled || redis == null) {
            return relay::deliver;
        }
        return new RedisChatBroadcaster(redis, mapper, relay);
    }

    public static ChatRateLimiter rateLimiter(StringRedisTemplate redis, boolean redisEnabled) {
        if (!redisEnabled || redis == null) {
            return userId -> { };
        }
        return new RedisChatRateLimiter(redis);
    }

    public static MessageListener subscriber(ObjectMapper mapper, ChatRelay relay) {
        return new ChatRedisSubscriber(mapper, relay);
    }

    public static String redisTopic() {
        return RedisChatBroadcaster.TOPIC;
    }
}
