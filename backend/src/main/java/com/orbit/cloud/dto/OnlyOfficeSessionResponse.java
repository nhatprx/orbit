package com.orbit.cloud.dto;

import java.util.Map;

public record OnlyOfficeSessionResponse(
    boolean enabled,
    String documentServerUrl,
    Map<String, Object> config,
    String token,
    String mode
) {}
