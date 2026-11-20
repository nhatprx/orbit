package com.orbit.ai.repository;

import com.orbit.ai.entity.AiMessageEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiMessageRepository extends JpaRepository<AiMessageEntity, UUID> {

    List<AiMessageEntity> findByThreadIdOrderByCreatedAtAsc(UUID threadId, Pageable pageable);

    List<AiMessageEntity> findByThreadIdOrderByCreatedAtDesc(UUID threadId, Pageable pageable);
}
