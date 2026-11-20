package com.orbit.auth.dto;

import jakarta.validation.constraints.Size;

public record UpdateAccountProfileRequest(
    @Size(max = 50, message = "Username must be at most 50 characters.")
    String username,

    @Size(max = 100, message = "Display name must be at most 100 characters.")
    String displayName
) {}
