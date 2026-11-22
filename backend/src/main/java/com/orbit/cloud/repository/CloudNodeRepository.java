package com.orbit.cloud.repository;

import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudScopeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CloudNodeRepository extends JpaRepository<CloudNodeEntity, UUID> {

    Optional<CloudNodeEntity> findByIdAndScopeTypeAndScopeId(
        UUID id, CloudScopeType scopeType, UUID scopeId
    );

    List<CloudNodeEntity> findByIdInAndScopeTypeAndScopeId(
        Collection<UUID> ids, CloudScopeType scopeType, UUID scopeId
    );

    @Query("""
        SELECT n FROM CloudNodeEntity n
        WHERE n.scopeType = :scopeType
          AND n.scopeId = :scopeId
          AND ((:parentId IS NULL AND n.parentId IS NULL) OR n.parentId = :parentId)
          AND n.deletedAt IS NULL
          AND n.uploadStatus <> com.orbit.cloud.entity.CloudUploadStatus.FAILED
        """)
    List<CloudNodeEntity> findActiveSiblings(
        @Param("scopeType") CloudScopeType scopeType,
        @Param("scopeId") UUID scopeId,
        @Param("parentId") UUID parentId
    );

    @Query("""
        SELECT n FROM CloudNodeEntity n
        WHERE n.scopeType = :scopeType
          AND n.scopeId = :scopeId
          AND ((:parentId IS NULL AND n.parentId IS NULL) OR n.parentId = :parentId)
          AND n.nameNormalized = :nameNormalized
          AND n.deletedAt IS NULL
          AND n.uploadStatus = com.orbit.cloud.entity.CloudUploadStatus.PENDING
        """)
    List<CloudNodeEntity> findPendingSiblings(
        @Param("scopeType") CloudScopeType scopeType,
        @Param("scopeId") UUID scopeId,
        @Param("parentId") UUID parentId,
        @Param("nameNormalized") String nameNormalized
    );

    List<CloudNodeEntity> findByScopeTypeAndScopeIdAndDeletedAtIsNotNull(
        CloudScopeType scopeType, UUID scopeId
    );

    List<CloudNodeEntity> findTop100ByDeletedAtIsNotNullAndPurgeAfterLessThanEqualOrderByPurgeAfterAsc(
        Instant now
    );

    @Query(value = """
        WITH RECURSIVE tree AS (
            SELECT id, parent_id, depth, node_type, size_bytes, storage_key, upload_status
            FROM cloud_nodes
            WHERE id = :rootId AND scope_type = :scopeType AND scope_id = :scopeId
            UNION ALL
            SELECT c.id, c.parent_id, c.depth, c.node_type, c.size_bytes, c.storage_key, c.upload_status
            FROM cloud_nodes c
            INNER JOIN tree t ON c.parent_id = t.id
            WHERE c.scope_type = :scopeType AND c.scope_id = :scopeId
        )
        SELECT id FROM tree
        """, nativeQuery = true)
    List<UUID> findSubtreeIds(
        @Param("rootId") UUID rootId,
        @Param("scopeType") String scopeType,
        @Param("scopeId") UUID scopeId
    );

    @Query(value = """
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id, name, 0 AS lvl
            FROM cloud_nodes
            WHERE id = :nodeId AND scope_type = :scopeType AND scope_id = :scopeId
            UNION ALL
            SELECT p.id, p.parent_id, p.name, a.lvl + 1
            FROM cloud_nodes p
            INNER JOIN ancestors a ON p.id = a.parent_id
            WHERE p.scope_type = :scopeType AND p.scope_id = :scopeId AND a.lvl < 25
        )
        SELECT id, name FROM ancestors ORDER BY lvl DESC
        """, nativeQuery = true)
    List<Object[]> findBreadcrumbRows(
        @Param("nodeId") UUID nodeId,
        @Param("scopeType") String scopeType,
        @Param("scopeId") UUID scopeId
    );

    @Query(value = """
        WITH RECURSIVE ancestors AS (
            SELECT id AS leaf_id, id AS curr_id, parent_id, name, 0 AS lvl
            FROM cloud_nodes
            WHERE id IN (:parentIds)
            UNION ALL
            SELECT a.leaf_id, p.id AS curr_id, p.parent_id, p.name, a.lvl + 1
            FROM cloud_nodes p
            INNER JOIN ancestors a ON p.id = a.parent_id
            WHERE a.lvl < 25
        )
        SELECT leaf_id, name, lvl
        FROM ancestors
        ORDER BY leaf_id, lvl DESC
        """, nativeQuery = true)
    List<Object[]> findAncestorPathRows(@Param("parentIds") Collection<UUID> parentIds);

    @Query(value = """
        SELECT storage_key FROM cloud_nodes
        WHERE scope_type = :scopeType AND scope_id IN (:scopeIds) AND storage_key IS NOT NULL
        """, nativeQuery = true)
    List<String> findStorageKeysByScopes(
        @Param("scopeType") String scopeType,
        @Param("scopeIds") Collection<UUID> scopeIds
    );

    @Modifying
    @Query("DELETE FROM CloudNodeEntity n WHERE n.scopeType = :scopeType AND n.scopeId IN :scopeIds")
    int deleteByScopeTypeAndScopeIdIn(
        @Param("scopeType") CloudScopeType scopeType,
        @Param("scopeIds") Collection<UUID> scopeIds
    );
}
