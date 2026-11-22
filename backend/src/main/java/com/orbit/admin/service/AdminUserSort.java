package com.orbit.admin.service;

import com.orbit.common.ApiException;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.domain.Sort;

/** Whitelisted sort parsing ("field,direction"); the id tie-breaker keeps pages stable. */
final class AdminUserSort {

    /** Sortable property mapped to whether it is a text column (sorted case-insensitively). */
    private static final Map<String, Boolean> FIELDS = Map.of(
        "createdAt", false,
        "username", true,
        "email", true,
        "displayName", true,
        "role", true
    );

    static final Sort DEFAULT = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));

    private AdminUserSort() {}

    static Sort parse(String raw) {
        if (raw == null || raw.isBlank()) return DEFAULT;
        String[] parts = raw.trim().split(",", -1);
        String field = parts[0].trim();
        Boolean text = parts.length <= 2 ? FIELDS.get(field) : null;
        if (text == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Unsupported sort field.");
        }
        Sort.Order order = new Sort.Order(direction(parts.length == 2 ? parts[1] : "asc"), field);
        return Sort.by(text ? order.ignoreCase() : order, Sort.Order.asc("id"));
    }

    private static Sort.Direction direction(String raw) {
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "asc" -> Sort.Direction.ASC;
            case "desc" -> Sort.Direction.DESC;
            default -> throw ApiException.badRequest("VALIDATION_ERROR", "Sort direction must be asc or desc.");
        };
    }
}
