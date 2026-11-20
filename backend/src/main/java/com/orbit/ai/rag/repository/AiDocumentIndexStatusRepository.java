package com.orbit.ai.rag.repository;

import com.orbit.ai.rag.entity.AiDocumentIndexStatusEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiDocumentIndexStatusRepository extends JpaRepository<AiDocumentIndexStatusEntity, UUID> {

    List<AiDocumentIndexStatusEntity> findByScopeTypeAndScopeIdOrderByUpdatedAtDesc(
        String scopeType, UUID scopeId, Pageable pageable
    );
}
