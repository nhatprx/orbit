package com.orbit.issues.repository;

import com.orbit.issues.entity.ProjectIssueEntity;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectIssueRepository
    extends JpaRepository<ProjectIssueEntity, UUID>, JpaSpecificationExecutor<ProjectIssueEntity> {

    Optional<ProjectIssueEntity> findByIdAndProjectId(UUID id, UUID projectId);

    List<ProjectIssueEntity> findByParentIdOrderByIssueNumberAsc(UUID parentId);

    List<ProjectIssueEntity> findByParentIdIn(Collection<UUID> parentIds);

    List<ProjectIssueEntity> findBySprintIdOrderByIssueNumberAsc(UUID sprintId);

    List<ProjectIssueEntity> findByProjectIdInOrderByUpdatedAtDesc(Collection<UUID> projectIds, Pageable pageable);

    @Query("""
        SELECT new com.orbit.issues.repository.SprintMetricsAggregate(
            i.sprintId,
            COUNT(i),
            SUM(CASE WHEN i.status = com.orbit.issues.entity.IssueStatus.DONE THEN 1L ELSE 0L END),
            COALESCE(SUM(COALESCE(i.storyPoints, 0)), 0L),
            COALESCE(SUM(CASE WHEN i.status = com.orbit.issues.entity.IssueStatus.DONE THEN COALESCE(i.storyPoints, 0) ELSE 0 END), 0L)
        )
        FROM ProjectIssueEntity i
        WHERE i.projectId = :projectId AND i.sprintId IS NOT NULL
        GROUP BY i.sprintId
        """)
    List<SprintMetricsAggregate> aggregateSprintMetricsByProjectId(@Param("projectId") UUID projectId);

    @Query("""
        SELECT new com.orbit.issues.repository.SprintMetricsAggregate(
            i.sprintId,
            COUNT(i),
            SUM(CASE WHEN i.status = com.orbit.issues.entity.IssueStatus.DONE THEN 1L ELSE 0L END),
            COALESCE(SUM(COALESCE(i.storyPoints, 0)), 0L),
            COALESCE(SUM(CASE WHEN i.status = com.orbit.issues.entity.IssueStatus.DONE THEN COALESCE(i.storyPoints, 0) ELSE 0 END), 0L)
        )
        FROM ProjectIssueEntity i
        WHERE i.sprintId = :sprintId
        GROUP BY i.sprintId
        """)
    Optional<SprintMetricsAggregate> aggregateSprintMetricsBySprintId(@Param("sprintId") UUID sprintId);

    @Query("""
        SELECT new com.orbit.issues.repository.ProjectIssueAggregate(
            i.projectId,
            COUNT(i),
            SUM(CASE WHEN i.status = com.orbit.issues.entity.IssueStatus.BACKLOG THEN 1L ELSE 0L END),
            SUM(CASE WHEN i.status = com.orbit.issues.entity.IssueStatus.TODO THEN 1L ELSE 0L END),
            SUM(CASE WHEN i.status = com.orbit.issues.entity.IssueStatus.IN_PROGRESS THEN 1L ELSE 0L END),
            SUM(CASE WHEN i.status = com.orbit.issues.entity.IssueStatus.IN_REVIEW THEN 1L ELSE 0L END),
            SUM(CASE WHEN i.status = com.orbit.issues.entity.IssueStatus.DONE THEN 1L ELSE 0L END),
            SUM(CASE WHEN i.priority = com.orbit.issues.entity.IssuePriority.CRITICAL THEN 1L ELSE 0L END)
        )
        FROM ProjectIssueEntity i
        WHERE i.projectId IN :projectIds
        GROUP BY i.projectId
        """)
    List<ProjectIssueAggregate> summarizeByProjectIds(@Param("projectIds") Collection<UUID> projectIds);
}
