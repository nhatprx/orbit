package com.orbit.chat.dto;

import java.time.Instant;
import java.util.UUID;

public record ChatChannelDto(
    UUID id,
    String scopeType,
    UUID scopeId,
    String name,
    String description,
    String channelType,
    String category,
    int participantCount,
    Instant createdAt,
    String avatarUrl,
    UUID parentChannelId
) {
    public ChatChannelDto(
        UUID id,
        String scopeType,
        UUID scopeId,
        String name,
        String description,
        String channelType,
        String category,
        int participantCount,
        Instant createdAt,
        String avatarUrl
    ) {
        this(id, scopeType, scopeId, name, description, channelType, category, participantCount, createdAt, avatarUrl, null);
    }

    public ChatChannelDto(
        UUID id,
        String scopeType,
        UUID scopeId,
        String name,
        String description,
        String channelType,
        String category,
        int participantCount,
        Instant createdAt
    ) {
        this(id, scopeType, scopeId, name, description, channelType, category, participantCount, createdAt, null, null);
    }

    public ChatChannelDto(
        UUID id,
        String scopeType,
        UUID scopeId,
        String name,
        String description,
        Instant createdAt
    ) {
        this(id, scopeType, scopeId, name, description, "TEXT", "TEXT CHANNELS", 0, createdAt, null, null);
    }
}
