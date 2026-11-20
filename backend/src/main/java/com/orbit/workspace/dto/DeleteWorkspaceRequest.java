package com.orbit.workspace.dto;

import jakarta.validation.constraints.NotBlank;

public record DeleteWorkspaceRequest(
    @NotBlank(message = "Confirmation name is required.") String confirmName
) {}
