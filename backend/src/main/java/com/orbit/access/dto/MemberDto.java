package com.orbit.access.dto;

import java.time.Instant;
import java.util.UUID;

public record MemberDto(
    UUID userId,
    String username,
    String displayName,
    String email,
    UUID roleId,
    String roleName,
    boolean isOwner,
    Instant joinedAt
) {}
