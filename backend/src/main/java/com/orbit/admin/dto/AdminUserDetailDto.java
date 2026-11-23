package com.orbit.admin.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Full admin view of one user: profile, account status, linked sign-in providers, memberships. */
public record AdminUserDetailDto(
    UUID id,
    String username,
    String displayName,
    String email,
    String avatarUrl,
    String role,
    UserStatus status,
    boolean totpEnabled,
    long workspaceCount,
    Instant createdAt,
    Instant disabledAt,
    String disabledReason,
    String disabledByUsername,
    String country,
    String organization,
    String location,
    String website,
    String bio,
    List<LinkedProviderDto> linkedProviders,
    List<AdminUserWorkspaceDto> workspaces
) {}
