package com.orbit.cloud.repository;

import com.orbit.cloud.entity.CloudScopeType;
import com.orbit.cloud.entity.CloudStorageQuotaEntity;
import com.orbit.cloud.entity.CloudStorageQuotaId;
import java.util.Collection;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CloudStorageQuotaRepository extends JpaRepository<CloudStorageQuotaEntity, CloudStorageQuotaId> {

    @Modifying
    @Query(value = """
        INSERT INTO cloud_storage_quotas (scope_type, scope_id, used_bytes, quota_bytes, updated_at)
        VALUES (:scopeType, :scopeId, 0, :quotaBytes, NOW())
        ON CONFLICT (scope_type, scope_id) DO NOTHING
        """, nativeQuery = true)
    void ensureRow(
        @Param("scopeType") String scopeType,
        @Param("scopeId") UUID scopeId,
        @Param("quotaBytes") long quotaBytes
    );

    @Modifying
    @Query(value = """
        UPDATE cloud_storage_quotas
        SET used_bytes = used_bytes + :delta, updated_at = NOW()
        WHERE scope_type = :scopeType AND scope_id = :scopeId
          AND used_bytes + :delta <= quota_bytes
        """, nativeQuery = true)
    int tryAddUsedBytes(
        @Param("scopeType") String scopeType,
        @Param("scopeId") UUID scopeId,
        @Param("delta") long delta
    );

    @Modifying
    @Query(value = """
        UPDATE cloud_storage_quotas
        SET used_bytes = GREATEST(0, used_bytes - :delta), updated_at = NOW()
        WHERE scope_type = :scopeType AND scope_id = :scopeId
        """, nativeQuery = true)
    int subtractUsedBytes(
        @Param("scopeType") String scopeType,
        @Param("scopeId") UUID scopeId,
        @Param("delta") long delta
    );

    @Modifying
    @Query("DELETE FROM CloudStorageQuotaEntity q WHERE q.scopeType = :scopeType AND q.scopeId IN :scopeIds")
    int deleteByScopeTypeAndScopeIdIn(
        @Param("scopeType") CloudScopeType scopeType,
        @Param("scopeIds") Collection<UUID> scopeIds
    );
}
