package com.orbit.chat.dto;

import java.time.Instant;
import java.util.UUID;

public record ChatChannelDto(
    UUID id,
    String scopeType,
    UUID scopeId,
    String name,
    String description,
    Instant createdAt
) {}
