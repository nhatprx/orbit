package com.orbit.chat.service;

import com.orbit.chat.dto.ChatMessageDeletedDto;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.ChatTypingDto;
import com.orbit.chat.dto.ChatPresenceEvent;
import com.orbit.chat.dto.ChatReactionEvent;
import com.orbit.chat.dto.VoiceEventDto;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/** Delivers messages, deletions, and voice events to the STOMP subscribers connected to this instance. */
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ChatRelay {

    public static final String TOPIC_PREFIX = "/topic/chat.";
    public static final String VOICE_SUFFIX = ".voice";

    private final SimpMessagingTemplate template;

    ChatRelay(@Lazy SimpMessagingTemplate template) {
        this.template = template;
    }

    public void deliver(ChatMessageDto message) {
        template.convertAndSend(TOPIC_PREFIX + message.channelId(), message);
    }

    public void deliverDeletion(ChatMessageDeletedDto event) {
        template.convertAndSend(TOPIC_PREFIX + event.channelId(), event);
    }

    public void deliverVoice(VoiceEventDto event) {
        template.convertAndSend(TOPIC_PREFIX + event.channelId() + VOICE_SUFFIX, event);
    }

    public void deliverTyping(ChatTypingDto event) {
        template.convertAndSend(TOPIC_PREFIX + event.channelId(), event);
    }

    public void deliverPresence(ChatPresenceEvent event) {
        template.convertAndSend("/topic/chat-presence." + event.scopeType().toLowerCase()
            + "." + event.scopeId(), event);
    }

    public void deliverReaction(ChatReactionEvent event) {
        template.convertAndSend(TOPIC_PREFIX + event.channelId(), event);
    }
}
