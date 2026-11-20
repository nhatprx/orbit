package com.orbit.workspace.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record KeyCount(UUID key, long count) {

    public static Map<UUID, Long> toMap(List<KeyCount> rows) {
        Map<UUID, Long> result = new HashMap<>();
        for (KeyCount row : rows) {
            result.put(row.key(), row.count());
        }
        return result;
    }
}
