package com.orbit.access.dto;

import java.time.Instant;
import java.util.UUID;

public record InvitationDto(
    UUID id,
    UUID workspaceId,
    UUID projectId,
    String type,
    String email,
    String token,
    UUID roleId,
    String roleName,
    String status,
    Instant expiresAt,
    Instant createdAt
) {}
