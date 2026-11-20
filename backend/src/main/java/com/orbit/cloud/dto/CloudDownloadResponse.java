package com.orbit.cloud.dto;

import java.time.Instant;

public record CloudDownloadResponse(
    String url,
    Instant expiresAt,
    String provider,
    String filename,
    String mimeType,
    long sizeBytes
) {}
