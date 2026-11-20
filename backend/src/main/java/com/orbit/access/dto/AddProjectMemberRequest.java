package com.orbit.access.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AddProjectMemberRequest(
    @NotNull(message = "User is required.") UUID userId,
    @NotNull(message = "Role is required.") UUID roleId
) {}
