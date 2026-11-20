package com.orbit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyTotpRequest(
    @NotBlank(message = "Verification code is required.")
    String code
) {}
