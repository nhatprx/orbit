package com.orbit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record EnableTwoFactorRequest(
    @NotBlank(message = "Password is required to enable two-factor authentication.")
    String password,

    @NotBlank(message = "Verification code is required.")
    String code
) {}
