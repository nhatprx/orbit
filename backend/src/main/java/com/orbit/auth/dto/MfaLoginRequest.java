package com.orbit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record MfaLoginRequest(
    @NotBlank(message = "MFA challenge token is required.")
    String mfaToken,
    @NotBlank(message = "Verification code is required.")
    String code
) {}
