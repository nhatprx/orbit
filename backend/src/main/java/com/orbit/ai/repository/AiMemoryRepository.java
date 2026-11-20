package com.orbit.ai.repository;

import com.orbit.ai.entity.AiMemoryEntity;
import com.orbit.ai.entity.AiScopeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiMemoryRepository extends JpaRepository<AiMemoryEntity, UUID> {

    Optional<AiMemoryEntity> findByIdAndUserId(UUID id, UUID userId);

    List<AiMemoryEntity> findByUserIdAndScopeTypeOrderByPinnedDescUpdatedAtDesc(
        UUID userId, AiScopeType scopeType, Pageable pageable
    );

    List<AiMemoryEntity> findByScopeTypeAndWorkspaceIdOrderByPinnedDescUpdatedAtDesc(
        AiScopeType scopeType, UUID workspaceId, Pageable pageable
    );

    List<AiMemoryEntity> findByScopeTypeAndProjectIdOrderByPinnedDescUpdatedAtDesc(
        AiScopeType scopeType, UUID projectId, Pageable pageable
    );
}
