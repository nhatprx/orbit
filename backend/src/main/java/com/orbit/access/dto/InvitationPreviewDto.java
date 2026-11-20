package com.orbit.access.dto;

import java.time.Instant;
import java.util.UUID;

public record InvitationPreviewDto(
    String token,
    UUID workspaceId,
    String workspaceName,
    UUID projectId,
    String projectName,
    String roleName,
    String type,
    String invitedEmail,
    String status,
    Instant expiresAt
) {}
