package com.orbit.workspace.dto;

public record ProjectModuleDto(
    String key,
    String name,
    String description,
    boolean enabledInWorkspace,
    boolean enabledInProject,
    boolean effectiveEnabled
) {}
