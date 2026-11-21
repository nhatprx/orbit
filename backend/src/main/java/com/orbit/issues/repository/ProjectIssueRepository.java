package com.orbit.issues.repository;

import com.orbit.issues.entity.ProjectIssueEntity;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectIssueRepository extends JpaRepository<ProjectIssueEntity, UUID> {

    List<ProjectIssueEntity> findByProjectIdOrderByIssueNumberDesc(UUID projectId);

    Optional<ProjectIssueEntity> findByIdAndProjectId(UUID id, UUID projectId);

    List<ProjectIssueEntity> findByParentIdOrderByIssueNumberAsc(UUID parentId);

    List<ProjectIssueEntity> findByParentIdIn(Collection<UUID> parentIds);

    List<ProjectIssueEntity> findBySprintIdOrderByIssueNumberAsc(UUID sprintId);

    List<ProjectIssueEntity> findByWorkspaceIdOrderByUpdatedAtDesc(UUID workspaceId);

    List<ProjectIssueEntity> findByProjectIdInOrderByUpdatedAtDesc(Collection<UUID> projectIds);

    @Query("SELECT COALESCE(MAX(i.issueNumber), 0) FROM ProjectIssueEntity i WHERE i.projectId = :projectId")
    int findMaxIssueNumberByProjectId(@Param("projectId") UUID projectId);
}
