package com.orbit.chat.dto;

import java.util.UUID;

/** Ephemeral typing state broadcast to members subscribed to a chat channel. */
public record ChatTypingDto(String eventType, UUID channelId, UUID userId, String displayName, boolean active) {
    public static ChatTypingDto of(UUID channelId, UUID userId, String displayName, boolean active) {
        return new ChatTypingDto("TYPING", channelId, userId, displayName, active);
    }
}
