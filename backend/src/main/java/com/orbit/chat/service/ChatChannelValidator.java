package com.orbit.chat.service;

import com.orbit.chat.entity.ChatChannelType;
import com.orbit.common.ApiException;
import java.util.Locale;

/** Pure normalization and validation rules for chat channel fields. */
final class ChatChannelValidator {

    static final String DEFAULT_CHANNEL = "general";
    static final String DEFAULT_TEXT_CATEGORY = "TEXT CHANNELS";
    static final String DEFAULT_VOICE_CATEGORY = "VOICE CHANNELS";
    private static final int MAX_NAME_LENGTH = 80;
    private static final int MAX_DESCRIPTION_LENGTH = 255;
    private static final int MAX_CATEGORY_LENGTH = 64;

    private ChatChannelValidator() {}

    static ChatChannelType parseChannelType(String raw) {
        if (raw == null || raw.isBlank()) {
            return ChatChannelType.TEXT;
        }
        try {
            return ChatChannelType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Channel type must be TEXT or VOICE.");
        }
    }

    static String normalizeName(String raw, ChatChannelType type) {
        String trimmed = raw == null ? "" : raw.trim();
        if (trimmed.isEmpty()) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Channel name is required.");
        }
        String normalized = type == ChatChannelType.TEXT
            ? trimmed.toLowerCase(Locale.ROOT)
                .replaceAll("[\\s_]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "")
            : trimmed.replaceAll("\\s+", " ");
        if (normalized.isEmpty() || normalized.length() > MAX_NAME_LENGTH) {
            throw ApiException.badRequest(
                "VALIDATION_ERROR", "Channel name must be between 1 and " + MAX_NAME_LENGTH + " characters."
            );
        }
        return normalized;
    }

    static String normalizeDescription(String raw) {
        String trimmed = raw == null ? "" : raw.trim();
        if (trimmed.length() > MAX_DESCRIPTION_LENGTH) {
            throw ApiException.badRequest(
                "VALIDATION_ERROR", "Description must be at most " + MAX_DESCRIPTION_LENGTH + " characters."
            );
        }
        return trimmed;
    }

    static String normalizeCategory(String raw, ChatChannelType type) {
        String trimmed = raw == null ? "" : raw.trim();
        if (trimmed.isEmpty()) {
            return type == ChatChannelType.VOICE ? DEFAULT_VOICE_CATEGORY : DEFAULT_TEXT_CATEGORY;
        }
        if (trimmed.length() > MAX_CATEGORY_LENGTH) {
            throw ApiException.badRequest(
                "VALIDATION_ERROR", "Category must be at most " + MAX_CATEGORY_LENGTH + " characters."
            );
        }
        return trimmed;
    }
}
