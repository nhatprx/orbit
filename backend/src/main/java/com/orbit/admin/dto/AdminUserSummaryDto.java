package com.orbit.admin.dto;

import java.time.Instant;
import java.util.UUID;

/** One row of the admin user table. Never carries credentials or second-factor material. */
public record AdminUserSummaryDto(
    UUID id,
    String username,
    String displayName,
    String email,
    String role,
    UserStatus status,
    boolean totpEnabled,
    long workspaceCount,
    Instant createdAt,
    Instant disabledAt
) {}
