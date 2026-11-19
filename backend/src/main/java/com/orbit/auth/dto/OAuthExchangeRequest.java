package com.orbit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthExchangeRequest(
    @NotBlank(message = "OAuth exchange code is required.")
    String code
) {}
