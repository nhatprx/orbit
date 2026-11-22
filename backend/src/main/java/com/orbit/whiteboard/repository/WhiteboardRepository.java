package com.orbit.whiteboard.repository;

import com.orbit.whiteboard.dto.WhiteboardSummaryResponse;
import com.orbit.whiteboard.entity.WhiteboardEntity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WhiteboardRepository extends JpaRepository<WhiteboardEntity, UUID> {

    String SUMMARY_SELECT = """
        SELECT new com.orbit.whiteboard.dto.WhiteboardSummaryResponse(
            w.id, w.workspaceId, w.projectId, w.title, w.description,
            w.elementCount, w.version, w.createdBy, w.updatedBy, w.locked, w.lockedBy, w.lockedAt, w.createdAt, w.updatedAt
        )
        FROM WhiteboardEntity w
        """;

    @Query(SUMMARY_SELECT + " WHERE w.workspaceId = :workspaceId AND w.projectId IS NULL ORDER BY w.updatedAt DESC, w.id DESC")
    Page<WhiteboardSummaryResponse> findWorkspaceSummaries(@Param("workspaceId") UUID workspaceId, Pageable pageable);

    @Query(
        SUMMARY_SELECT
            + " WHERE w.workspaceId = :workspaceId AND w.projectId IS NULL"
            + " AND (LOWER(w.title) LIKE :pattern ESCAPE '\\' OR LOWER(w.description) LIKE :pattern ESCAPE '\\')"
            + " ORDER BY w.updatedAt DESC, w.id DESC"
    )
    Page<WhiteboardSummaryResponse> searchWorkspaceSummaries(
        @Param("workspaceId") UUID workspaceId,
        @Param("pattern") String pattern,
        Pageable pageable
    );

    @Query(SUMMARY_SELECT + " WHERE w.workspaceId = :workspaceId AND w.projectId = :projectId ORDER BY w.updatedAt DESC, w.id DESC")
    Page<WhiteboardSummaryResponse> findProjectSummaries(
        @Param("workspaceId") UUID workspaceId,
        @Param("projectId") UUID projectId,
        Pageable pageable
    );

    @Query(
        SUMMARY_SELECT
            + " WHERE w.workspaceId = :workspaceId AND w.projectId = :projectId"
            + " AND (LOWER(w.title) LIKE :pattern ESCAPE '\\' OR LOWER(w.description) LIKE :pattern ESCAPE '\\')"
            + " ORDER BY w.updatedAt DESC, w.id DESC"
    )
    Page<WhiteboardSummaryResponse> searchProjectSummaries(
        @Param("workspaceId") UUID workspaceId,
        @Param("projectId") UUID projectId,
        @Param("pattern") String pattern,
        Pageable pageable
    );

    Optional<WhiteboardEntity> findByIdAndWorkspaceIdAndProjectIdIsNull(UUID id, UUID workspaceId);

    Optional<WhiteboardEntity> findByIdAndWorkspaceIdAndProjectId(UUID id, UUID workspaceId, UUID projectId);

    boolean existsByIdAndWorkspaceIdAndProjectIdIsNull(UUID id, UUID workspaceId);

    boolean existsByIdAndWorkspaceIdAndProjectId(UUID id, UUID workspaceId, UUID projectId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        value = """
            UPDATE whiteboards
            SET scene_json = CAST(:sceneJson AS jsonb),
                element_count = :elementCount,
                version = version + 1,
                updated_by = :updatedBy,
                updated_at = :updatedAt
            WHERE id = :boardId
              AND workspace_id = :workspaceId
              AND project_id IS NULL
              AND version = :expectedVersion
            """,
        nativeQuery = true
    )
    int updateWorkspaceSceneIfVersionMatches(
        @Param("boardId") UUID boardId,
        @Param("workspaceId") UUID workspaceId,
        @Param("expectedVersion") long expectedVersion,
        @Param("sceneJson") String sceneJson,
        @Param("elementCount") int elementCount,
        @Param("updatedBy") UUID updatedBy,
        @Param("updatedAt") Instant updatedAt
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        value = """
            UPDATE whiteboards
            SET scene_json = CAST(:sceneJson AS jsonb),
                element_count = :elementCount,
                version = version + 1,
                updated_by = :updatedBy,
                updated_at = :updatedAt
            WHERE id = :boardId
              AND workspace_id = :workspaceId
              AND project_id = :projectId
              AND version = :expectedVersion
            """,
        nativeQuery = true
    )
    int updateProjectSceneIfVersionMatches(
        @Param("boardId") UUID boardId,
        @Param("workspaceId") UUID workspaceId,
        @Param("projectId") UUID projectId,
        @Param("expectedVersion") long expectedVersion,
        @Param("sceneJson") String sceneJson,
        @Param("elementCount") int elementCount,
        @Param("updatedBy") UUID updatedBy,
        @Param("updatedAt") Instant updatedAt
    );
}
