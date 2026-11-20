package com.orbit.storage.dto;

import java.time.Instant;

public record PresignedUrlResponse(
    String key,
    String url,
    String method,
    Instant expiresAt
) {
}
