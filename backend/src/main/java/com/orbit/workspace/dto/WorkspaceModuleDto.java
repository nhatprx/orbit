package com.orbit.workspace.dto;

public record WorkspaceModuleDto(
    String key,
    String name,
    String description,
    boolean enabled,
    long activeProjectCount
) {}
