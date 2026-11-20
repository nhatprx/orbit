package com.orbit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
    String currentPassword,
    @NotBlank(message = "New password is required.")
    String newPassword
) {}
