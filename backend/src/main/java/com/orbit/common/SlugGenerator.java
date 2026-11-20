package com.orbit.common;

import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;
import java.util.function.Predicate;

public final class SlugGenerator {

    private static final int MAX_BASE_LENGTH = 60;
    private static final int MAX_SUFFIX_ATTEMPTS = 50;

    private SlugGenerator() {}

    public static String slugify(String name, String fallback) {
        // U+0111 and U+0110 (d with stroke) do not decompose under NFD, so fold them explicitly.
        String folded = name == null ? "" : name.replace((char) 0x0111, 'd').replace((char) 0x0110, 'D');
        String ascii = Normalizer.normalize(folded, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String slug = ascii.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-+|-+$", "");
        if (slug.length() > MAX_BASE_LENGTH) {
            slug = slug.substring(0, MAX_BASE_LENGTH).replaceAll("-+$", "");
        }
        return slug.isEmpty() ? fallback : slug;
    }

    public static String unique(String name, String fallback, Predicate<String> exists) {
        String base = slugify(name, fallback);
        if (!exists.test(base)) return base;
        for (int i = 2; i <= MAX_SUFFIX_ATTEMPTS; i++) {
            String candidate = base + "-" + i;
            if (!exists.test(candidate)) return candidate;
        }
        return base + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
