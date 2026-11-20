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
    Instant createdAt
) {}
