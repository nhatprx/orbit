package com.orbit.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.ChatMessageDto;
import java.io.IOException;
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
        try {
            relay.deliver(mapper.readValue(message.getBody(), ChatMessageDto.class));
        } catch (IOException | RuntimeException ex) {
            LOG.warn("Dropping malformed chat pub/sub payload: {}", ex.getMessage());
        }
    }
}
