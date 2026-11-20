package com.orbit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record DisableTwoFactorRequest(
    String password,
    @NotBlank(message = "Verification code is required.")
    String code
) {}
