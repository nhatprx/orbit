package com.orbit.auth.dto;

public record TwoFactorSetupResponse(String secret, String otpauthUri) {}
