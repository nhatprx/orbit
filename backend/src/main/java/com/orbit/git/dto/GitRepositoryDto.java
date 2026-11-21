package com.orbit.git.dto;

import java.time.Instant;
import java.util.UUID;

public record GitRepositoryDto(
    UUID id,
    String scopeType,
    UUID scopeId,
    String provider,
    String repoOwner,
    String repoName,
    String slug,
    String defaultBranch,
    String visibility,
    String cloneUrl,
    String htmlUrl,
    String tokenHint,
    Instant lastSyncedAt,
    Instant createdAt
) {}
