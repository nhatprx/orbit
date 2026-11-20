package com.orbit.workspace.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record TransferOwnershipRequest(
    @NotNull(message = "Target user is required.") UUID targetUserId
) {}
