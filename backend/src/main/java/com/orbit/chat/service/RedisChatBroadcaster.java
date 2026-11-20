package com.orbit.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.ChatMessageDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Publishes to Redis so every instance (including this one, through its subscriber) delivers the
 * message to its own STOMP sessions. If Redis is unavailable it degrades to local-only delivery.
 */
class RedisChatBroadcaster implements ChatBroadcaster {

    static final String TOPIC = "orbit:chat:messages";

    private static final Logger LOG = LoggerFactory.getLogger(RedisChatBroadcaster.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final ChatRelay relay;

    RedisChatBroadcaster(StringRedisTemplate redis, ObjectMapper mapper, ChatRelay relay) {
        this.redis = redis;
        this.mapper = mapper;
        this.relay = relay;
    }

    @Override
    public void broadcast(ChatMessageDto message) {
        try {
            redis.convertAndSend(TOPIC, mapper.writeValueAsString(message));
        } catch (JsonProcessingException | RuntimeException ex) {
            LOG.warn("Redis chat publish failed, delivering locally only: {}", ex.getMessage());
            relay.deliver(message);
        }
    }
}
