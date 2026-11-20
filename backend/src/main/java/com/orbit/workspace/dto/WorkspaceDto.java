package com.orbit.workspace.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkspaceDto(
    UUID id,
    String name,
    String slug,
    String description,
    String avatarUrl,
    UUID ownerId,
    long memberCount,
    long projectCount,
    List<String> enabledModules,
    List<String> myPermissions,
    Instant createdAt,
    Instant updatedAt,
    Instant deletedAt,
    Instant purgeAfter
) {}
