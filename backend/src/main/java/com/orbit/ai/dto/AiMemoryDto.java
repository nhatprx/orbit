package com.orbit.ai.dto;

import com.orbit.ai.entity.AiMemoryEntity;

public record AiMemoryDto(
    String id,
    String scopeType,
    String workspaceId,
    String projectId,
    String category,
    String content,
    boolean pinned,
    boolean vectorIndexed,
    String updatedAt
) {

    public static AiMemoryDto from(AiMemoryEntity entity) {
        return new AiMemoryDto(
            entity.getId().toString(),
            entity.getScopeType().name(),
            entity.getWorkspaceId() != null ? entity.getWorkspaceId().toString() : null,
            entity.getProjectId() != null ? entity.getProjectId().toString() : null,
            entity.getCategory(),
            entity.getContent(),
            entity.isPinned(),
            entity.getQdrantPointId() != null && !entity.getQdrantPointId().isBlank(),
            entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null
        );
    }
}
