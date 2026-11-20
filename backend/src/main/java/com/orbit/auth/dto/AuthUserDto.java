package com.orbit.auth.dto;

import com.orbit.auth.entity.UserEntity;

public record AuthUserDto(
    String id,
    String name,
    String username,
    String email,
    String country,
    boolean emailPreference,
    String role,
    String workspaceId,
    String avatarUrl
) {

    public static AuthUserDto from(UserEntity user) {
        return from(user, null);
    }

    public static AuthUserDto from(UserEntity user, String avatarUrl) {
        return new AuthUserDto(
            user.getId().toString(),
            user.getDisplayName(),
            user.getUsername(),
            user.getEmail(),
            user.getCountry(),
            user.isEmailPreference(),
            user.getRole(),
            user.getWorkspaceId(),
            avatarUrl
        );
    }
}
