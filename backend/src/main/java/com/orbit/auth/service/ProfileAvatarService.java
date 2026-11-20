package com.orbit.auth.service;

import com.orbit.auth.dto.AuthUserDto;
import com.orbit.auth.dto.AvatarPresignRequest;
import com.orbit.auth.dto.AvatarPresignResponse;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import com.orbit.storage.dto.PresignedUrlResponse;
import com.orbit.storage.service.S3KeyValidator;
import com.orbit.storage.service.StorageService;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileAvatarService {

    public static final long MAX_AVATAR_BYTES = 5L * 1024L * 1024L;
    public static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    );

    private final UserRepository userRepository;
    private final StorageService storageService;

    public ProfileAvatarService(UserRepository userRepository, StorageService storageService) {
        this.userRepository = userRepository;
        this.storageService = storageService;
    }

    @Transactional(readOnly = true)
    public AvatarPresignResponse createUploadUrl(UUID userId, AvatarPresignRequest request) {
        requireUser(userId);
        String contentType = validateContentType(request.contentType());
        validateFileSize(request.fileSize());

        String sanitizedFilename = S3KeyValidator.sanitizeFilename(request.filename());
        String objectKey = userAvatarPrefix(userId) + UUID.randomUUID() + "-" + sanitizedFilename;
        PresignedUrlResponse presigned = storageService.createPresignedUploadUrlForKey(objectKey, contentType);

        return new AvatarPresignResponse(
            presigned.key(),
            presigned.url(),
            presigned.method(),
            presigned.expiresAt(),
            contentType
        );
    }

    @Transactional
    public AuthUserDto confirmAvatar(UUID userId, String key) {
        UserEntity user = requireUser(userId);
        String validatedKey = validateOwnedAvatarKey(userId, key);

        String previousKey = user.getAvatarKey();
        user.setAvatarKey(validatedKey);
        UserEntity saved = userRepository.save(user);

        if (previousKey != null && !previousKey.isBlank() && !previousKey.equals(validatedKey)) {
            storageService.deleteObject(previousKey);
        }

        return AuthUserDto.from(saved, storageService.resolveObjectUrl(saved.getAvatarKey()));
    }

    @Transactional
    public AuthUserDto removeAvatar(UUID userId) {
        UserEntity user = requireUser(userId);
        String previousKey = user.getAvatarKey();
        if (previousKey == null || previousKey.isBlank()) {
            return AuthUserDto.from(user, null);
        }

        user.setAvatarKey(null);
        UserEntity saved = userRepository.save(user);
        storageService.deleteObject(previousKey);
        return AuthUserDto.from(saved, null);
    }

    private UserEntity requireUser(UUID userId) {
        return userRepository.findById(userId).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found.")
        );
    }

    private String validateContentType(String rawContentType) {
        if (rawContentType == null || rawContentType.isBlank()) {
            throw invalidTypeException();
        }
        String normalized = rawContentType.trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_CONTENT_TYPES.contains(normalized)) {
            throw invalidTypeException();
        }
        return normalized;
    }

    private void validateFileSize(Long fileSize) {
        if (fileSize == null || fileSize <= 0 || fileSize > MAX_AVATAR_BYTES) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "INVALID_AVATAR_SIZE",
                "Avatar file size must be between 1 byte and 5 MB."
            );
        }
    }

    private String validateOwnedAvatarKey(UUID userId, String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            throw invalidAvatarKeyException();
        }
        String trimmed = rawKey.trim();
        if (trimmed.contains("..") || trimmed.contains("\\") || trimmed.startsWith("/")) {
            throw invalidAvatarKeyException();
        }
        String expectedPrefix = userAvatarPrefix(userId);
        if (!trimmed.startsWith(expectedPrefix) || trimmed.length() <= expectedPrefix.length()) {
            throw invalidAvatarKeyException();
        }
        return trimmed;
    }

    private String userAvatarPrefix(UUID userId) {
        return "avatars/" + userId + "/";
    }

    private ApiException invalidTypeException() {
        return new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_AVATAR_TYPE",
            "Avatar must be a JPEG, PNG, WebP, or GIF image."
        );
    }

    private ApiException invalidAvatarKeyException() {
        return new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_AVATAR_KEY",
            "Avatar storage key is invalid or does not belong to the authenticated user."
        );
    }
}
