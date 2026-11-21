package com.orbit.git.repository;

import com.orbit.git.entity.GitRepositoryEntity;
import com.orbit.git.entity.GitScopeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GitRepositoryJpaRepository extends JpaRepository<GitRepositoryEntity, UUID> {

    Optional<GitRepositoryEntity> findByScopeTypeAndScopeId(GitScopeType scopeType, UUID scopeId);

    void deleteByScopeTypeAndScopeId(GitScopeType scopeType, UUID scopeId);
}
