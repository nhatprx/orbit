package com.orbit.auth.dto;

import java.util.List;

public record TwoFactorEnableResponse(boolean enabled, List<String> backupCodes) {}
