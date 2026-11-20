package com.orbit.ai.dto;

import jakarta.validation.constraints.Size;

public record CreateAiThreadRequest(
    String scopeType,
    String workspaceId,
    String projectId,
    @Size(max = 160)
    String title,
    String model
) {}
