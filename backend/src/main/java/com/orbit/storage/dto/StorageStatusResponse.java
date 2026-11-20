package com.orbit.storage.dto;

import java.util.List;

public record StorageStatusResponse(
    boolean enabled,
    String provider,
    String bucket,
    String region,
    int presignDurationMinutes,
    List<String> allowedPrefixes
) {
}
