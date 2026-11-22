package com.orbit.chat.service;

import com.orbit.common.ApiException;
import java.util.Locale;

/** Pure validation and normalization helpers for chat message payloads. */
final class ChatMessageValidator {

    static final int MAX_CONTENT_LENGTH = 4000;
    private static final int MAX_REPLY_SNIPPET = 200;
    private static final int MAX_REPLY_SENDER_NAME = 120;
    private static final int MAX_ATTACHMENT_NAME = 255;
    private static final int MAX_ATTACHMENT_URL = 1024;

    private ChatMessageValidator() {}

    static String validateContent(String raw) {
        return validateContent(raw, false);
    }

    static String validateContent(String raw, boolean hasAttachment) {
        String content = raw == null ? "" : raw.trim();
        if (content.length() > MAX_CONTENT_LENGTH || (content.isEmpty() && !hasAttachment)) {
            throw ApiException.badRequest(
                "VALIDATION_ERROR", "Message must be between 1 and " + MAX_CONTENT_LENGTH + " characters."
            );
        }
        return content;
    }

    static String validateAttachmentName(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.length() > MAX_ATTACHMENT_NAME) {
            throw ApiException.badRequest(
                "VALIDATION_ERROR", "Attachment name must be at most " + MAX_ATTACHMENT_NAME + " characters."
            );
        }
        return trimmed;
    }

    static String validateAttachmentUrl(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String url = raw.trim();
        if (url.length() > MAX_ATTACHMENT_URL) {
            throw ApiException.badRequest(
                "VALIDATION_ERROR", "Attachment URL must be at most " + MAX_ATTACHMENT_URL + " characters."
            );
        }
        String lower = url.toLowerCase(Locale.ROOT);
        boolean allowed = lower.startsWith("https://")
            || lower.startsWith("http://")
            || url.startsWith("/api/");
        if (!allowed || url.contains(" ") || url.contains("\n") || url.contains("\r")) {
            throw ApiException.badRequest(
                "VALIDATION_ERROR", "Attachment URL must be an http(s) URL or a relative /api/ path."
            );
        }
        return url;
    }

    static String formatReplySender(String displayName) {
        String safe = displayName == null || displayName.isBlank() ? "Unknown" : displayName.trim();
        return safe.length() > MAX_REPLY_SENDER_NAME ? safe.substring(0, MAX_REPLY_SENDER_NAME) : safe;
    }

    static String formatReplySnippet(String content) {
        String cleaned = content == null ? "" : content.replaceAll("\\s+", " ").trim();
        return cleaned.length() > MAX_REPLY_SNIPPET ? cleaned.substring(0, MAX_REPLY_SNIPPET) : cleaned;
    }
}
