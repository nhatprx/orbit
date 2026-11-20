package com.orbit.cloud.repository;

import com.orbit.cloud.entity.CloudScopeType;
import com.orbit.cloud.entity.CloudUploadSessionEntity;
import com.orbit.cloud.entity.CloudUploadSessionStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CloudUploadSessionRepository extends JpaRepository<CloudUploadSessionEntity, UUID> {

    Optional<CloudUploadSessionEntity> findByIdAndScopeTypeAndScopeId(
        UUID id, CloudScopeType scopeType, UUID scopeId
    );

    List<CloudUploadSessionEntity> findTop100ByStatusAndExpiresAtLessThanEqualOrderByExpiresAtAsc(
        CloudUploadSessionStatus status, Instant now
    );

    @Modifying
    @Query("DELETE FROM CloudUploadSessionEntity s WHERE s.scopeType = :scopeType AND s.scopeId IN :scopeIds")
    int deleteByScopeTypeAndScopeIdIn(
        @Param("scopeType") CloudScopeType scopeType,
        @Param("scopeIds") Collection<UUID> scopeIds
    );
}
