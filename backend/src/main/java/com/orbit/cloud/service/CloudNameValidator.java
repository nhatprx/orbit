package com.orbit.cloud.service;

import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.common.ApiException;
import java.util.Locale;

/** Validates, normalizes, protects extensions, and generates Finder-style collision names. */
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

    /** Extracts extension including leading dot when a dot appears after index 0 and not at the end. */
    public static String extractExtension(String name) {
        if (name == null || name.isEmpty()) {
            return "";
        }
        int lastDot = name.lastIndexOf('.');
        if (lastDot <= 0 || lastDot >= name.length() - 1) {
            return "";
        }
        return name.substring(lastDot);
    }

    /** Enforces extension preservation when renaming files that have an existing extension. */
    public static String validateRename(String currentName, CloudNodeType nodeType, String rawNewName) {
        String trimmed = validateAndTrim(rawNewName);
        if (nodeType != CloudNodeType.FILE) {
            return trimmed;
        }
        String originalExt = extractExtension(currentName);
        if (originalExt.isEmpty()) {
            return trimmed;
        }
        String canonicalExt = originalExt.toLowerCase(Locale.ROOT);
        if (trimmed.equalsIgnoreCase(canonicalExt)) {
            throw ApiException.badRequest("INVALID_NAME", "File name cannot be empty before extension.");
        }
        String newExt = extractExtension(trimmed);
        if (newExt.isEmpty()) {
            return validateAndTrim(trimmed + canonicalExt);
        }
        if (!newExt.equalsIgnoreCase(originalExt)) {
            throw ApiException.badRequest(
                "EXTENSION_CHANGE_FORBIDDEN",
                "Cannot change file extension from " + canonicalExt
                    + ". Rename the file without changing its extension."
            );
        }
        String base = trimmed.substring(0, trimmed.length() - newExt.length());
        return validateAndTrim(base + canonicalExt);
    }

    /** Generates Finder-style numbered names such as "demo (1).docx" or "Folder (1)". */
    public static String numberedName(String name, CloudNodeType nodeType, int index) {
        String suffix = " (" + index + ")";
        String ext = nodeType == CloudNodeType.FILE ? extractExtension(name) : "";
        String base = ext.isEmpty() ? name : name.substring(0, name.length() - ext.length());
        int maxBaseLen = Math.max(1, MAX_NAME_LENGTH - suffix.length() - ext.length());
        if (base.length() > maxBaseLen) {
            base = base.substring(0, maxBaseLen).trim();
        }
        return base + suffix + ext;
    }

    public static String normalize(String validName) {
        return validName.toLowerCase(Locale.ROOT);
    }
}
