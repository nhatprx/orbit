package com.orbit.access.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AssignMemberRoleRequest(@NotNull(message = "Role is required.") UUID roleId) {}
