package com.orbit.issues.repository;

import com.orbit.issues.entity.IssueSprintEntity;
import com.orbit.issues.entity.SprintStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IssueSprintRepository extends JpaRepository<IssueSprintEntity, UUID> {

    List<IssueSprintEntity> findByProjectIdOrderByCreatedAtDesc(UUID projectId);

    Optional<IssueSprintEntity> findByIdAndProjectId(UUID id, UUID projectId);

    boolean existsByProjectIdAndStatus(UUID projectId, SprintStatus status);

    boolean existsByProjectIdAndStatusAndIdNot(UUID projectId, SprintStatus status, UUID id);

    List<IssueSprintEntity> findByWorkspaceIdAndStatus(UUID workspaceId, SprintStatus status);

    List<IssueSprintEntity> findByProjectIdInAndStatus(Collection<UUID> projectIds, SprintStatus status);

    List<IssueSprintEntity> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
}
