package com.orbit.ai.rag;

import com.orbit.ai.rag.entity.AiDocumentIndexStatusEntity;

public record AiDocumentIndexDto(
    String nodeId,
    String filename,
    String status,
    int chunkCount,
    String errorMessage,
    String indexedAt,
    String updatedAt
) {
    public static AiDocumentIndexDto from(AiDocumentIndexStatusEntity entity) {
        return new AiDocumentIndexDto(
            entity.getNodeId().toString(),
            entity.getFilename(),
            entity.getStatus(),
            entity.getChunkCount(),
            entity.getErrorMessage(),
            entity.getIndexedAt() != null ? entity.getIndexedAt().toString() : null,
            entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null
        );
    }
}
