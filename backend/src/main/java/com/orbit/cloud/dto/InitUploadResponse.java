package com.orbit.cloud.dto;

import com.orbit.cloud.entity.CloudUploadStrategy;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record InitUploadResponse(
    UUID sessionId,
    UUID nodeId,
    CloudUploadStrategy strategy,
    String uploadUrl,
    Map<String, String> uploadHeaders,
    long partSizeBytes,
    int totalParts,
    Instant expiresAt
) {}
