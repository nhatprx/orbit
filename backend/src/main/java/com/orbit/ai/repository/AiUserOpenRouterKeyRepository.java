package com.orbit.ai.repository;

import com.orbit.ai.entity.AiUserOpenRouterKeyEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiUserOpenRouterKeyRepository extends JpaRepository<AiUserOpenRouterKeyEntity, UUID> {}
