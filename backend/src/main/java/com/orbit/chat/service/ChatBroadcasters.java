package com.orbit.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.ChatMessageDeletedDto;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.ChatTypingDto;
import com.orbit.chat.dto.VoiceEventDto;
import java.util.List;
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
            return local(relay);
        }
        return new RedisChatBroadcaster(redis, mapper, relay);
    }

    public static ChatBroadcaster local(ChatRelay relay) {
        if (relay == null) return message -> { };
        return new ChatBroadcaster() {
            @Override
            public void broadcast(ChatMessageDto message) {
                relay.deliver(message);
            }

            @Override
            public void broadcastDeletion(ChatMessageDeletedDto event) {
                relay.deliverDeletion(event);
            }

            @Override
            public void broadcastVoice(VoiceEventDto event) {
                relay.deliverVoice(event);
            }

            @Override
            public void broadcastTyping(ChatTypingDto event) { relay.deliverTyping(event); }
        };
    }

    public static ChatRateLimiter rateLimiter(StringRedisTemplate redis, boolean redisEnabled) {
        if (!redisEnabled || redis == null) {
            return userId -> { };
        }
        return new RedisChatRateLimiter(redis);
    }

    public static VoicePresenceStore voicePresenceStore(
        StringRedisTemplate redis, ObjectMapper mapper, boolean redisEnabled
    ) {
        if (!redisEnabled || redis == null) {
            return new InMemoryVoicePresenceStore();
        }
        return new RedisVoicePresenceStore(redis, mapper);
    }

    public static MessageListener subscriber(ObjectMapper mapper, ChatRelay relay) {
        return new ChatRedisSubscriber(mapper, relay);
    }

    public static String redisTopic() {
        return RedisChatBroadcaster.TOPIC;
    }

    public static List<String> redisTopics() {
        return List.of(
            RedisChatBroadcaster.TOPIC,
            RedisChatBroadcaster.DELETION_TOPIC,
            RedisChatBroadcaster.VOICE_TOPIC,
            RedisChatBroadcaster.TYPING_TOPIC
        );
    }
}
