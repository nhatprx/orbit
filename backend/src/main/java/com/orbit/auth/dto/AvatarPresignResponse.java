package com.orbit.auth.dto;

import java.time.Instant;

public record AvatarPresignResponse(
    String key,
    String uploadUrl,
    String method,
    Instant expiresAt,
    String contentType
) {
}
