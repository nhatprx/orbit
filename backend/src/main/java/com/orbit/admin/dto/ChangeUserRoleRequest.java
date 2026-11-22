package com.orbit.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ChangeUserRoleRequest(
    @NotBlank(message = "Role is required.")
    @Pattern(regexp = "(?i)^(user|admin)$", message = "Role must be user or admin.")
    String role
) {}
