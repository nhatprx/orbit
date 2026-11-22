package com.orbit.whiteboard.dto;

import com.orbit.whiteboard.entity.WhiteboardAssetEntity;
import java.time.Instant;

public record WhiteboardAssetResponse(
    String fileId,
    String mimeType,
    String dataUrl,
    int byteSize,
    Instant createdAt
) {

    public static WhiteboardAssetResponse from(WhiteboardAssetEntity entity) {
        return new WhiteboardAssetResponse(
            entity.getFileId(),
            entity.getMimeType(),
            entity.getDataUrl(),
            entity.getByteSize(),
            entity.getCreatedAt()
        );
    }
}
