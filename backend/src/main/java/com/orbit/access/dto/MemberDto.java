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
    String subRole,
    boolean isOwner,
    Instant joinedAt
) {
    public MemberDto(
        UUID userId, String username, String displayName, String email,
        UUID roleId, String roleName, boolean isOwner, Instant joinedAt
    ) {
        this(userId, username, displayName, email, roleId, roleName, null, isOwner, joinedAt);
    }
}
