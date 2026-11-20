package com.orbit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record StartTwoFactorSetupRequest(
    @NotBlank(message = "Password is required to enable two-factor authentication.")
    String password
) {}
