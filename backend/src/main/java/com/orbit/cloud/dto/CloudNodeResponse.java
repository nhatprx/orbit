package com.orbit.cloud.dto;

import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudScopeType;
import java.time.Instant;
import java.util.UUID;

public record CloudNodeResponse(
    UUID id,
    CloudScopeType scopeType,
    UUID scopeId,
    UUID parentId,
    CloudNodeType nodeType,
    String name,
    String mimeType,
    long sizeBytes,
    boolean starred,
    int depth,
    UUID createdBy,
    String createdByName,
    Instant deletedAt,
    Instant purgeAfter,
    Instant createdAt,
    Instant updatedAt,
    String folderPath
) {}
