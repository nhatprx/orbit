package com.orbit.storage.service;

import com.orbit.common.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;

public final class S3KeyValidator {

    public static final List<String> ALLOWED_PREFIXES = List.of("uploads/", "avatars/", "artifacts/");
    private static final int MAX_FILENAME_LENGTH = 120;

    private S3KeyValidator() {}

    public static String normalizePrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            throw invalidPrefixException();
        }
        String trimmed = prefix.trim();
        String normalized = trimmed.endsWith("/") ? trimmed : trimmed + "/";
        if (!ALLOWED_PREFIXES.contains(normalized)) {
            throw invalidPrefixException();
        }
        return normalized;
    }

    public static String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            throw invalidFilenameException();
        }
        String baseName = filename.trim().replace('\\', '/');
        int lastSlash = baseName.lastIndexOf('/');
        if (lastSlash >= 0) {
            baseName = baseName.substring(lastSlash + 1);
        }
        String cleaned = baseName
            .replace("..", "")
            .replaceAll("[^A-Za-z0-9._-]", "_")
            .replaceAll("^[._-]+", "");

        if (cleaned.isBlank()) {
            throw invalidFilenameException();
        }
        if (cleaned.length() > MAX_FILENAME_LENGTH) {
            cleaned = cleaned.substring(cleaned.length() - MAX_FILENAME_LENGTH);
        }
        return cleaned;
    }

    public static String validateObjectKey(String key) {
        if (key == null || key.isBlank()) {
            throw invalidKeyException();
        }
        String trimmed = key.trim();
        if (trimmed.contains("..") || trimmed.contains("\\") || trimmed.startsWith("/")) {
            throw invalidKeyException();
        }
        for (String allowed : ALLOWED_PREFIXES) {
            if (trimmed.startsWith(allowed) && trimmed.length() > allowed.length()) {
                return trimmed;
            }
        }
        throw invalidKeyException();
    }

    private static ApiException invalidPrefixException() {
        return new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_STORAGE_PREFIX",
            "Prefix must be one of: uploads/, avatars/, artifacts/."
        );
    }

    private static ApiException invalidFilenameException() {
        return new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_FILENAME",
            "Filename contains no valid characters."
        );
    }

    private static ApiException invalidKeyException() {
        return new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_STORAGE_KEY",
            "Object key must start with an allowed prefix."
        );
    }
}
