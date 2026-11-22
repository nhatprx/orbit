package com.orbit.whiteboard.dto;

import com.orbit.whiteboard.entity.WhiteboardEntity;
import java.time.Instant;
import java.util.UUID;

public record WhiteboardSummaryResponse(
    UUID id,
    UUID workspaceId,
    UUID projectId,
    String title,
    String description,
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

    public static WhiteboardSummaryResponse from(WhiteboardEntity entity) {
        return new WhiteboardSummaryResponse(
            entity.getId(),
            entity.getWorkspaceId(),
            entity.getProjectId(),
            entity.getTitle(),
            entity.getDescription(),
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
