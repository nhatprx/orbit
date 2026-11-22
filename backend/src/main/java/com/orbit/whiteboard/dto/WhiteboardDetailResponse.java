package com.orbit.whiteboard.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.orbit.whiteboard.entity.WhiteboardEntity;
import java.time.Instant;
import java.util.UUID;

public record WhiteboardDetailResponse(
    UUID id,
    UUID workspaceId,
    UUID projectId,
    String title,
    String description,
    JsonNode sceneJson,
    int elementCount,
    long version,
    UUID createdBy,
    UUID updatedBy,
    boolean locked,
    UUID lockedBy,
    Instant lockedAt,
    Instant createdAt,
    Instant updatedAt
) {

    public static WhiteboardDetailResponse from(WhiteboardEntity entity) {
        return new WhiteboardDetailResponse(
            entity.getId(),
            entity.getWorkspaceId(),
            entity.getProjectId(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getSceneJson(),
            entity.getElementCount(),
            entity.getVersion(),
            entity.getCreatedBy(),
            entity.getUpdatedBy(),
            entity.isLocked(),
            entity.getLockedBy(),
            entity.getLockedAt(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
