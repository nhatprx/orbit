package com.orbit.access.dto;

import jakarta.validation.constraints.Size;

public record UpdateMemberSubRoleRequest(
    @Size(max = 64, message = "Sub-role must be at most 64 characters.")
    String subRole
) {}
