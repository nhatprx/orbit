package com.orbit.workspace.repository;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Grouped JPQL projection: an owning id plus one string value (module key, permission key). */
public record KeyValue(UUID key, String value) {

    public static Map<UUID, List<String>> groupList(List<KeyValue> rows) {
        Map<UUID, List<String>> result = new LinkedHashMap<>();
        for (KeyValue row : rows) {
            result.computeIfAbsent(row.key(), k -> new ArrayList<>()).add(row.value());
        }
        return result;
    }

    public static Map<UUID, Set<String>> groupSet(List<KeyValue> rows) {
        Map<UUID, Set<String>> result = new LinkedHashMap<>();
        for (KeyValue row : rows) {
            result.computeIfAbsent(row.key(), k -> new HashSet<>()).add(row.value());
        }
        return result;
    }
}
