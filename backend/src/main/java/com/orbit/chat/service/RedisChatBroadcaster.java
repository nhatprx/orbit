package com.orbit.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.ChatMessageDeletedDto;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.VoiceEventDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Publishes chat messages, deletion events, and voice events to Redis so every API instance
 * delivers them to its own STOMP sessions. Degrades to local-only delivery when Redis fails.
 */
class RedisChatBroadcaster implements ChatBroadcaster {

    static final String TOPIC = "orbit:chat:messages";
    static final String DELETION_TOPIC = "orbit:chat:deletions";
    static final String VOICE_TOPIC = "orbit:chat:voice";

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
        publish(TOPIC, message, () -> relay.deliver(message));
    }

    @Override
    public void broadcastDeletion(ChatMessageDeletedDto event) {
        publish(DELETION_TOPIC, event, () -> relay.deliverDeletion(event));
    }

    @Override
    public void broadcastVoice(VoiceEventDto event) {
        publish(VOICE_TOPIC, event, () -> relay.deliverVoice(event));
    }

    private void publish(String topic, Object payload, Runnable localFallback) {
        try {
            redis.convertAndSend(topic, mapper.writeValueAsString(payload));
        } catch (JsonProcessingException | RuntimeException ex) {
            LOG.warn("Redis publish on {} failed, delivering locally only: {}", topic, ex.getMessage());
            localFallback.run();
        }
    }
}
