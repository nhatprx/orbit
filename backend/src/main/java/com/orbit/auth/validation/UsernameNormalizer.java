package com.orbit.auth.validation;

import com.orbit.common.ApiException;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;

public final class UsernameNormalizer {

    private static final Pattern VALID_USERNAME = Pattern.compile("^[a-z0-9][a-z0-9._-]{2,49}$");

    private UsernameNormalizer() {}

    public static String normalizeStrict(String raw) {
        String normalized = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (!VALID_USERNAME.matcher(normalized).matches()) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "INVALID_USERNAME",
                "Username must be 3-50 chars using lowercase letters, digits, '.', '_' or '-'."
            );
        }
        return normalized;
    }

    public static String sanitizeCandidate(String raw, String fallbackPrefix) {
        String base = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        base = base.replaceAll("[^a-z0-9._-]", "");
        base = base.replaceAll("^[^a-z0-9]+", "");
        if (base.length() < 3) {
            base = fallbackPrefix + base;
        }
        if (base.length() > 40) {
            base = base.substring(0, 40);
        }
        return base;
    }
}
