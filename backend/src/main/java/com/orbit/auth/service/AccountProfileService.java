package com.orbit.auth.service;

import com.orbit.auth.dto.AuthUserDto;
import com.orbit.auth.dto.UpdateAccountProfileRequest;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.validation.UsernameNormalizer;
import com.orbit.common.ApiException;
import com.orbit.storage.service.StorageService;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountProfileService {

    private static final int MAX_PINNED_PROJECTS = 6;
    private static final Set<String> ALLOWED_STATUSES = Set.of("ONLINE", "OFFLINE", "BUSY", "AWAY");

    private final UserRepository userRepository;
    private final StorageService storageService;

    @Autowired
    public AccountProfileService(UserRepository userRepository, StorageService storageService) {
        this.userRepository = userRepository;
        this.storageService = storageService;
    }

    @Transactional
    public AuthUserDto updateProfile(UUID userId, UpdateAccountProfileRequest request) {
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found.")
        );

        boolean changed = applyIdentityUpdates(user, request);
        changed |= applyProfileDetails(user, request);
        changed |= applyPresenceAndPins(user, request);

        UserEntity saved = changed ? userRepository.save(user) : user;
        String avatarUrl = storageService != null ? storageService.resolveObjectUrl(saved.getAvatarKey()) : null;
        return AuthUserDto.from(saved, avatarUrl);
    }

    private boolean applyIdentityUpdates(UserEntity user, UpdateAccountProfileRequest request) {
        boolean changed = false;
        if (request.username() != null) {
            String normalized = UsernameNormalizer.normalizeStrict(request.username());
            if (!normalized.equalsIgnoreCase(user.getUsername())) {
                if (userRepository.existsByUsernameIgnoreCase(normalized)) {
                    throw new ApiException(HttpStatus.CONFLICT, "USERNAME_TAKEN", "Username is already taken.");
                }
                user.setUsername(normalized);
                changed = true;
            }
        }
        if (request.displayName() != null) {
            String trimmed = request.displayName().trim();
            if (trimmed.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DISPLAY_NAME", "Display name cannot be empty.");
            }
            if (!trimmed.equals(user.getDisplayName())) {
                user.setDisplayName(trimmed);
                changed = true;
            }
        }
        return changed;
    }

    private boolean applyProfileDetails(UserEntity user, UpdateAccountProfileRequest request) {
        boolean changed = false;
        if (request.bio() != null) {
            String val = normalizeOptional(request.bio());
            if (!Objects.equals(val, user.getBio())) { user.setBio(val); changed = true; }
        }
        if (request.introduction() != null) {
            String val = normalizeOptional(request.introduction());
            if (!Objects.equals(val, user.getIntroduction())) { user.setIntroduction(val); changed = true; }
        }
        if (request.organization() != null) {
            String val = normalizeOptional(request.organization());
            if (!Objects.equals(val, user.getOrganization())) { user.setOrganization(val); changed = true; }
        }
        if (request.location() != null) {
            String val = normalizeOptional(request.location());
            if (!Objects.equals(val, user.getLocation())) { user.setLocation(val); changed = true; }
        }
        if (request.website() != null) {
            String val = normalizeWebsite(request.website());
            if (!Objects.equals(val, user.getWebsite())) { user.setWebsite(val); changed = true; }
        }
        return changed;
    }

    private boolean applyPresenceAndPins(UserEntity user, UpdateAccountProfileRequest request) {
        boolean changed = false;
        if (request.activeStatus() != null) {
            String normalized = request.activeStatus().trim().toUpperCase();
            if (!ALLOWED_STATUSES.contains(normalized)) {
                throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_ACTIVE_STATUS",
                    "Active status must be ONLINE, OFFLINE, BUSY, or AWAY."
                );
            }
            if (!normalized.equals(user.getActiveStatus())) {
                user.setActiveStatus(normalized);
                changed = true;
            }
            boolean enabled = !"OFFLINE".equals(normalized);
            if (enabled != user.isActiveStatusEnabled()) {
                user.setActiveStatusEnabled(enabled);
                changed = true;
            }
        } else if (request.activeStatusEnabled() != null && request.activeStatusEnabled() != user.isActiveStatusEnabled()) {
            user.setActiveStatusEnabled(request.activeStatusEnabled());
            user.setActiveStatus(request.activeStatusEnabled() ? "ONLINE" : "OFFLINE");
            changed = true;
        }
        if (request.pinnedProjectIds() != null) {
            String serialized = serializePinnedIds(request.pinnedProjectIds());
            if (!Objects.equals(serialized, user.getPinnedProjectIds())) {
                user.setPinnedProjectIds(serialized);
                changed = true;
            }
        }
        return changed;
    }

    private String normalizeOptional(String value) {
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeWebsite(String value) {
        String trimmed = value.trim();
        if (trimmed.isEmpty()) return null;
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "INVALID_WEBSITE",
                "Website URL must start with http:// or https://."
            );
        }
        return trimmed;
    }

    private String serializePinnedIds(List<String> ids) {
        Set<String> valid = new LinkedHashSet<>();
        for (String raw : ids) {
            if (raw == null || raw.isBlank()) continue;
            try {
                valid.add(UUID.fromString(raw.trim()).toString());
            } catch (IllegalArgumentException ex) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PROJECT_ID", "Pinned project ID must be a valid UUID.");
            }
        }
        if (valid.size() > MAX_PINNED_PROJECTS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TOO_MANY_PINNED", "You can pin at most 6 projects.");
        }
        return valid.isEmpty() ? null : String.join(",", valid);
    }
}
