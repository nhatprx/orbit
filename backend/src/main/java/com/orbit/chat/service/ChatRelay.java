package com.orbit.chat.service;

import com.orbit.chat.dto.ChatMessageDto;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/** Delivers a message to the STOMP subscribers connected to this API instance. */
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ChatRelay {

    public static final String TOPIC_PREFIX = "/topic/chat.";

    private final SimpMessagingTemplate template;

    ChatRelay(@Lazy SimpMessagingTemplate template) {
        this.template = template;
    }

    public void deliver(ChatMessageDto message) {
        template.convertAndSend(TOPIC_PREFIX + message.channelId(), message);
    }
}
