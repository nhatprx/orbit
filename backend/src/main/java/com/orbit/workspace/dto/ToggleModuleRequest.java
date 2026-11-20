package com.orbit.workspace.dto;

import jakarta.validation.constraints.NotNull;

public record ToggleModuleRequest(@NotNull(message = "enabled is required.") Boolean enabled) {}
