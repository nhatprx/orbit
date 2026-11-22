package com.orbit.chat.service;

import com.orbit.chat.dto.ChatMessageDeletedDto;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.ChatTypingDto;
import com.orbit.chat.dto.ChatPresenceEvent;
import com.orbit.chat.dto.ChatReactionEvent;
import com.orbit.chat.dto.VoiceEventDto;

/** Fans persisted chat messages, deletions, and voice events out to all STOMP subscribers across nodes. */
@FunctionalInterface
public interface ChatBroadcaster {

    void broadcast(ChatMessageDto message);

    default void broadcastDeletion(ChatMessageDeletedDto event) {
        // Optional for test doubles that only assert message broadcasts.
    }

    default void broadcastVoice(VoiceEventDto event) {
        // Optional for test doubles that only assert message broadcasts.
    }

    default void broadcastTyping(ChatTypingDto event) { }

    default void broadcastPresence(ChatPresenceEvent event) { }

    default void broadcastReaction(ChatReactionEvent event) { }
}
