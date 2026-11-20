package com.orbit.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateAiMemoryRequest(
    String scopeType,
    String workspaceId,
    String projectId,
    String category,
    @NotBlank(message = "Memory content is required.")
    @Size(max = 1000, message = "Memory content must be at most 1000 characters.")
    String content,
    Boolean pinned
) {}
