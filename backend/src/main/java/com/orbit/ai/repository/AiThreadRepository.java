package com.orbit.ai.repository;

import com.orbit.ai.entity.AiScopeType;
import com.orbit.ai.entity.AiThreadEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiThreadRepository extends JpaRepository<AiThreadEntity, UUID> {

    Optional<AiThreadEntity> findByIdAndUserId(UUID id, UUID userId);

    List<AiThreadEntity> findByUserIdOrderByUpdatedAtDesc(UUID userId, Pageable pageable);

    List<AiThreadEntity> findByUserIdAndScopeTypeAndWorkspaceIdOrderByUpdatedAtDesc(
        UUID userId, AiScopeType scopeType, UUID workspaceId, Pageable pageable
    );
}
