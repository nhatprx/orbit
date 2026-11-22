package com.orbit.admin.dto;

import jakarta.validation.constraints.Size;

public record DisableUserRequest(
    @Size(max = 255, message = "Reason must be at most 255 characters.")
    String reason
) {}
