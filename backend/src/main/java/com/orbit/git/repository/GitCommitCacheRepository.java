package com.orbit.git.repository;

import com.orbit.git.entity.GitCommitCacheEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GitCommitCacheRepository extends JpaRepository<GitCommitCacheEntity, UUID> {

    List<GitCommitCacheEntity> findByRepositoryIdAndBranchOrderByCommittedAtDesc(
        UUID repositoryId, String branch
    );

    void deleteByRepositoryIdAndBranch(UUID repositoryId, String branch);
}
