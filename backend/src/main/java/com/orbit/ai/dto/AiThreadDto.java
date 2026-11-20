package com.orbit.ai.dto;

import com.orbit.ai.entity.AiThreadEntity;

public record AiThreadDto(
    String id,
    String scopeType,
    String workspaceId,
    String projectId,
    String title,
    String model,
    int messageCount,
    String updatedAt
) {

    public static AiThreadDto from(AiThreadEntity entity) {
        return new AiThreadDto(
            entity.getId().toString(),
            entity.getScopeType().name(),
            entity.getWorkspaceId() != null ? entity.getWorkspaceId().toString() : null,
            entity.getProjectId() != null ? entity.getProjectId().toString() : null,
            entity.getTitle(),
            entity.getModelTier(),
            entity.getMessageCount(),
            entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null
        );
    }
}
