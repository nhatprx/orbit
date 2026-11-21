package com.orbit.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.ChatMessageDeletedDto;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.VoiceEventDto;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;

class ChatRedisSubscriber implements MessageListener {

    private static final Logger LOG = LoggerFactory.getLogger(ChatRedisSubscriber.class);

    private final ObjectMapper mapper;
    private final ChatRelay relay;

    ChatRedisSubscriber(ObjectMapper mapper, ChatRelay relay) {
        this.mapper = mapper;
        this.relay = relay;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String topic = message.getChannel() == null
            ? RedisChatBroadcaster.TOPIC
            : new String(message.getChannel(), StandardCharsets.UTF_8);
        try {
            if (RedisChatBroadcaster.VOICE_TOPIC.equals(topic)) {
                relay.deliverVoice(mapper.readValue(message.getBody(), VoiceEventDto.class));
            } else if (RedisChatBroadcaster.DELETION_TOPIC.equals(topic)) {
                relay.deliverDeletion(mapper.readValue(message.getBody(), ChatMessageDeletedDto.class));
            } else {
                relay.deliver(mapper.readValue(message.getBody(), ChatMessageDto.class));
            }
        } catch (IOException | RuntimeException ex) {
            LOG.warn("Dropping malformed chat pub/sub payload on {}: {}", topic, ex.getMessage());
        }
    }
}
