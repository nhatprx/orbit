package com.orbit.auth.dto;

import com.orbit.auth.entity.UserEntity;
import java.util.Arrays;
import java.util.List;

public record AuthUserDto(
    String id,
    String name,
    String username,
    String email,
    String country,
    boolean emailPreference,
    String role,
    String workspaceId,
    String avatarUrl,
    String bio,
    String introduction,
    String organization,
    String location,
    String website,
    boolean activeStatusEnabled,
    String activeStatus,
    List<String> pinnedProjectIds,
    String createdAt
) {

    public static AuthUserDto from(UserEntity user) {
        return from(user, null);
    }

    public static AuthUserDto from(UserEntity user, String avatarUrl) {
        String status = user.getActiveStatus() != null
            ? user.getActiveStatus()
            : (user.isActiveStatusEnabled() ? "ONLINE" : "OFFLINE");
        return new AuthUserDto(
            user.getId().toString(),
            user.getDisplayName(),
            user.getUsername(),
            user.getEmail(),
            user.getCountry(),
            user.isEmailPreference(),
            user.getRole(),
            user.getWorkspaceId(),
            avatarUrl,
            user.getBio(),
            user.getIntroduction(),
            user.getOrganization(),
            user.getLocation(),
            user.getWebsite(),
            user.isActiveStatusEnabled(),
            status,
            parsePinnedIds(user.getPinnedProjectIds()),
            user.getCreatedAt() != null ? user.getCreatedAt().toString() : null
        );
    }

    private static List<String> parsePinnedIds(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    }
}
