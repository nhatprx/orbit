package com.orbit.auth.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Helper for encoding, counting, and consuming single-use BCrypt-hashed 2FA backup codes. */
final class BackupCodeCodec {

    private BackupCodeCodec() {}

    static String encodeAll(List<String> plainCodes, PasswordEncoder encoder) {
        return String.join("\n", plainCodes.stream().map(encoder::encode).toList());
    }

    static List<String> parseHashes(String stored) {
        if (stored == null || stored.isBlank()) return List.of();
        return Arrays.stream(stored.split("\n"))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    }

    static ConsumeResult consumeMatch(String stored, String rawCode, PasswordEncoder encoder) {
        String normalized = rawCode.trim().toUpperCase(Locale.ROOT);
        List<String> hashes = new ArrayList<>(parseHashes(stored));
        for (int i = 0; i < hashes.size(); i++) {
            if (encoder.matches(normalized, hashes.get(i))) {
                hashes.remove(i);
                return new ConsumeResult(true, hashes.isEmpty() ? null : String.join("\n", hashes));
            }
        }
        return new ConsumeResult(false, stored);
    }

    record ConsumeResult(boolean matched, String remainingEncoded) {}
}
