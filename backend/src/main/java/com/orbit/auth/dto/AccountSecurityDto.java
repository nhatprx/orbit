package com.orbit.auth.dto;

import java.util.List;

public record AccountSecurityDto(
    String email,
    String username,
    boolean hasPassword,
    boolean totpEnabled,
    int backupCodesRemaining,
    List<String> linkedProviders
) {}
