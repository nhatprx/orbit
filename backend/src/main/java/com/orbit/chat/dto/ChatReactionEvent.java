package com.orbit.chat.dto;

import java.util.UUID;

public record ChatReactionEvent(
    String eventType,
    UUID channelId,
    UUID messageId,
    String reactionKey,
    UUID userId,
    boolean active,
    long count
) {
    public static final String EVENT_TYPE = "REACTION_CHANGED";
}
