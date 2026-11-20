package com.orbit.chat.service;

import com.orbit.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

/** Opaque keyset cursor: (createdAt in epoch microseconds, message id). */
record ChatCursor(Instant createdAt, UUID id) {

    static String encode(Instant createdAt, UUID id) {
        long micros = ChronoUnit.MICROS.between(Instant.EPOCH, createdAt);
        String raw = micros + ":" + id;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    static ChatCursor decode(String cursor) {
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            int separator = raw.indexOf(':');
            long micros = Long.parseLong(raw.substring(0, separator));
            UUID id = UUID.fromString(raw.substring(separator + 1));
            return new ChatCursor(Instant.EPOCH.plus(micros, ChronoUnit.MICROS), id);
        } catch (RuntimeException ex) {
            throw ApiException.badRequest("INVALID_CURSOR", "The pagination cursor is not valid.");
        }
    }
}
