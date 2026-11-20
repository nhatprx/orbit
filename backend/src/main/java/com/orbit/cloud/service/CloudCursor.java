package com.orbit.cloud.service;

import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

/** Opaque keyset cursor encoding (typeRank, sortValue, nodeId). */
public record CloudCursor(int typeRank, String sortValue, UUID id) {

    public static String encode(CloudNodeEntity node, String sortBy) {
        int rank = node.getNodeType() == CloudNodeType.FOLDER ? 0 : 1;
        String value = switch (sortBy) {
            case "size" -> Long.toString(node.getSizeBytes());
            case "updatedAt" -> Long.toString(ChronoUnit.MICROS.between(Instant.EPOCH, node.getUpdatedAt()));
            default -> node.getNameNormalized();
        };
        String encodedVal = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(value.getBytes(StandardCharsets.UTF_8));
        String raw = rank + "|" + encodedVal + "|" + node.getId();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    public static CloudCursor decode(String cursor) {
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", 3);
            if (parts.length != 3) {
                throw new IllegalArgumentException("Invalid cursor parts");
            }
            int rank = Integer.parseInt(parts[0]);
            if (rank != 0 && rank != 1) {
                throw new IllegalArgumentException("Invalid rank");
            }
            String value = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            UUID id = UUID.fromString(parts[2]);
            return new CloudCursor(rank, value, id);
        } catch (RuntimeException ex) {
            throw ApiException.badRequest("INVALID_CURSOR", "The pagination cursor is not valid.");
        }
    }

    public long sortValueAsLong() {
        try {
            return Long.parseLong(sortValue);
        } catch (NumberFormatException ex) {
            throw ApiException.badRequest("INVALID_CURSOR", "The pagination cursor is not valid.");
        }
    }

    public Instant sortValueAsInstant() {
        return Instant.EPOCH.plus(sortValueAsLong(), ChronoUnit.MICROS);
    }
}
