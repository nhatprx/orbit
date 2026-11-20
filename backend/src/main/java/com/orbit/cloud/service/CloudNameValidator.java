package com.orbit.cloud.service;

import com.orbit.common.ApiException;
import java.util.Locale;

/** Validates and normalizes Cloud Files node names across all scopes. */
public final class CloudNameValidator {

    public static final int MAX_NAME_LENGTH = 255;

    private CloudNameValidator() {}

    public static String validateAndTrim(String rawName) {
        if (rawName == null) {
            throw ApiException.badRequest("INVALID_NAME", "Name is required.");
        }
        String trimmed = rawName.trim();
        if (trimmed.isEmpty()) {
            throw ApiException.badRequest("INVALID_NAME", "Name cannot be blank.");
        }
        if (trimmed.length() > MAX_NAME_LENGTH) {
            throw ApiException.badRequest("INVALID_NAME", "Name must be at most 255 characters.");
        }
        if (".".equals(trimmed) || "..".equals(trimmed)) {
            throw ApiException.badRequest("INVALID_NAME", "Name cannot be '.' or '..'.");
        }
        for (int i = 0; i < trimmed.length(); i++) {
            char ch = trimmed.charAt(i);
            if (ch == '/' || ch == '\\' || ch < 0x20 || ch == 0x7F) {
                throw ApiException.badRequest("INVALID_NAME", "Name contains invalid characters.");
            }
        }
        return trimmed;
    }

    public static String normalize(String validName) {
        return validName.toLowerCase(Locale.ROOT);
    }
}
