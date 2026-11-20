package com.orbit.access.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateRoleRequest(
    @NotBlank(message = "Role name is required.")
    @Size(max = 50, message = "Role name must be at most 50 characters.")
    String name,

    @NotNull(message = "Permissions are required.")
    @Size(max = 64, message = "Too many permissions.")
    List<String> permissions
) {}
