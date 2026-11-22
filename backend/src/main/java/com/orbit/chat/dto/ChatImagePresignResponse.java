package com.orbit.chat.dto;

import java.time.Instant;

public record ChatImagePresignResponse(
    String key,
    String uploadUrl,
    String attachmentUrl,
    String method,
    String contentType,
    Instant expiresAt
) {}
