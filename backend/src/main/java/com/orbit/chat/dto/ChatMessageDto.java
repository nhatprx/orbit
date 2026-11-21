package com.orbit.chat.dto;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageDto(
    UUID id,
    UUID channelId,
    UUID senderId,
    String senderName,
    String senderUsername,
    String content,
    UUID replyToId,
    String replyToSenderName,
    String replyToSnippet,
    String attachmentName,
    String attachmentUrl,
    Instant createdAt
) {
    public ChatMessageDto(
        UUID id,
        UUID channelId,
        UUID senderId,
        String senderName,
        String senderUsername,
        String content,
        Instant createdAt
    ) {
        this(id, channelId, senderId, senderName, senderUsername, content, null, null, null, null, null, createdAt);
    }
}
