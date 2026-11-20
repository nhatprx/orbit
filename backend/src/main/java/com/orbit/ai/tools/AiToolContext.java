package com.orbit.ai.tools;

import com.orbit.ai.entity.AiScopeType;
import java.util.UUID;

public record AiToolContext(
    UUID userId,
    AiScopeType scopeType,
    UUID workspaceId,
    UUID projectId,
    boolean webSearchEnabled
) {}
