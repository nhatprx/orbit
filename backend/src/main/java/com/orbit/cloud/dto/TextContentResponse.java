package com.orbit.cloud.dto;

import java.time.Instant;
import java.util.UUID;

public record TextContentResponse(
    UUID nodeId,
    String name,
    String mimeType,
    String content,
    long sizeBytes,
    Instant updatedAt,
    String etag
) {}
