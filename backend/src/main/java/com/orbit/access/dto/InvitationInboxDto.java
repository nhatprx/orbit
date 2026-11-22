package com.orbit.access.dto;

import java.time.Instant;
import java.util.UUID;

public record InvitationInboxDto(
    UUID id,
    UUID workspaceId,
    String workspaceName,
    UUID projectId,
    String projectName,
    String token,
    String roleName,
    Instant expiresAt,
    Instant createdAt
) {}
