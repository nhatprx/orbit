package com.orbit.ai.rag.repository;

import com.orbit.ai.rag.entity.AiDocumentChunkEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AiDocumentChunkRepository extends JpaRepository<AiDocumentChunkEntity, UUID> {

    List<AiDocumentChunkEntity> findByNodeId(UUID nodeId);

    void deleteByNodeId(UUID nodeId);

    @Query(value = """
        SELECT c.* FROM ai_document_chunks c
        INNER JOIN cloud_nodes n ON n.id = c.node_id
        WHERE c.scope_type = :scopeType
          AND c.scope_id = :scopeId
          AND n.deleted_at IS NULL
          AND (
            to_tsvector('simple', c.content) @@ plainto_tsquery('simple', :query)
            OR LOWER(c.content) LIKE LOWER(CONCAT('%', :query, '%'))
          )
        ORDER BY ts_rank(to_tsvector('simple', c.content), plainto_tsquery('simple', :query)) DESC,
                 c.chunk_index ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<AiDocumentChunkEntity> searchFullText(
        @Param("scopeType") String scopeType,
        @Param("scopeId") UUID scopeId,
        @Param("query") String query,
        @Param("limit") int limit
    );
}
