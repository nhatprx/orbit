package com.orbit.chat.dto;

import java.time.Instant;
import java.util.UUID;

/** Realtime STOMP/Redis event emitted when a chat message is deleted. */
public record ChatMessageDeletedDto(
    String eventType,
    UUID channelId,
    UUID messageId,
    Instant deletedAt
) {
    public static final String EVENT_TYPE = "MESSAGE_DELETED";

    public static ChatMessageDeletedDto of(UUID channelId, UUID messageId) {
        return new ChatMessageDeletedDto(EVENT_TYPE, channelId, messageId, Instant.now());
    }
}
