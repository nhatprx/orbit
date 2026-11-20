package com.orbit.project.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProjectDto(
    UUID id,
    UUID workspaceId,
    String workspaceName,
    String name,
    String slug,
    String description,
    long memberCount,
    List<String> enabledModules,
    List<String> myPermissions,
    Instant createdAt,
    Instant updatedAt
) {}
