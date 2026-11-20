package com.orbit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ResetPasswordRequest(
    @NotBlank(message = "Reset token is required.")
    String token,

    @NotBlank(message = "New password is required.")
    String newPassword
) {}
