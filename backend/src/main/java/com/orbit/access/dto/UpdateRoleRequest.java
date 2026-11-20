package com.orbit.access.dto;

import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateRoleRequest(
    @Size(max = 50, message = "Role name must be at most 50 characters.")
    String name,

    @Size(max = 64, message = "Too many permissions.")
    List<String> permissions
) {}
