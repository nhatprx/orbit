package com.orbit.auth.service;

import com.orbit.auth.dto.AuthUserDto;
import com.orbit.auth.dto.UpdateAccountProfileRequest;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.validation.UsernameNormalizer;
import com.orbit.common.ApiException;
import com.orbit.storage.service.StorageService;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountProfileService {

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

        UserEntity saved = changed ? userRepository.save(user) : user;
        String avatarUrl = storageService != null ? storageService.resolveObjectUrl(saved.getAvatarKey()) : null;
        return AuthUserDto.from(saved, avatarUrl);
    }
}
