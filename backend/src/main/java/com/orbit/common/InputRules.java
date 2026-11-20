package com.orbit.common;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

/** Small input normalization and validation helpers shared by services. */
public final class InputRules {

    private InputRules() {}

    public static String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Accepts only absolute http(s) URLs so avatar values can never be script or data URIs. */
    public static String avatarUrl(String value) {
        String trimmed = blankToNull(value);
        if (trimmed == null) return null;
        try {
            URI uri = new URI(trimmed);
            String scheme = uri.getScheme();
            boolean http = "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
            if (!http || uri.getHost() == null) {
                throw invalidAvatar();
            }
            return trimmed;
        } catch (URISyntaxException ex) {
            throw invalidAvatar();
        }
    }

    public static List<String> normalizeEmails(Collection<String> emails) {
        if (emails == null) return List.of();
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String email : emails) {
            String normalized = blankToNull(email);
            if (normalized != null) unique.add(normalized.toLowerCase(Locale.ROOT));
        }
        return List.copyOf(unique);
    }

    private static ApiException invalidAvatar() {
        return ApiException.badRequest("VALIDATION_ERROR", "Avatar URL must be an absolute http or https URL.");
    }
}
