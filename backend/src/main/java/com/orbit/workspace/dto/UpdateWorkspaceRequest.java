package com.orbit.workspace.dto;

import jakarta.validation.constraints.Size;

public record UpdateWorkspaceRequest(
    @Size(max = 100, message = "Workspace name must be at most 100 characters.")
    String name,

    @Size(max = 500, message = "Description must be at most 500 characters.")
    String description,

    @Size(max = 500, message = "Avatar URL must be at most 500 characters.")
    String avatarUrl
) {}
