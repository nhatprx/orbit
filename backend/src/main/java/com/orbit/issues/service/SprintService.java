package com.orbit.issues.service;

import com.orbit.common.ApiException;
import com.orbit.issues.dto.CreateSprintRequest;
import com.orbit.issues.dto.SprintDto;
import com.orbit.issues.dto.UpdateSprintRequest;
import com.orbit.issues.entity.IssueActivityEntity;
import com.orbit.issues.entity.IssueSprintEntity;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.ProjectIssueEntity;
import com.orbit.issues.entity.SprintStatus;
import com.orbit.issues.repository.IssueActivityRepository;
import com.orbit.issues.repository.IssueSprintRepository;
import com.orbit.issues.repository.ProjectIssueRepository;
import com.orbit.issues.repository.SprintMetricsAggregate;
import com.orbit.workspace.permission.Permissions;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manages sprint lifecycle, state transitions, active uniqueness, and SQL-aggregated metrics. */
@Service
public class SprintService {

    private final IssueSprintRepository sprints;
    private final ProjectIssueRepository issues;
    private final IssueActivityRepository activities;
    private final IssueLookupHelper lookup;

    public SprintService(
        IssueSprintRepository sprints, ProjectIssueRepository issues,
        IssueActivityRepository activities, IssueLookupHelper lookup
    ) {
        this.sprints = sprints;
        this.issues = issues;
        this.activities = activities;
        this.lookup = lookup;
    }

    @Transactional(readOnly = true)
    public List<SprintDto> listSprints(UUID userId, UUID workspaceId, UUID projectId) {
        lookup.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_READ);
        List<IssueSprintEntity> sprintList = sprints.findByProjectIdOrderByCreatedAtDesc(projectId);
        if (sprintList.isEmpty()) return List.of();
        Map<UUID, SprintMetricsAggregate> metricsBySprint = issues.aggregateSprintMetricsByProjectId(projectId)
            .stream()
            .filter(m -> m.sprintId() != null)
            .collect(Collectors.toMap(SprintMetricsAggregate::sprintId, Function.identity(), (a, b) -> a));
        return sprintList.stream()
            .map(s -> toDto(s, metricsBySprint.getOrDefault(s.getId(), SprintMetricsAggregate.EMPTY)))
            .toList();
    }

    @Transactional
    public SprintDto createSprint(UUID userId, UUID workspaceId, UUID projectId, CreateSprintRequest request) {
        lookup.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_WRITE, Permissions.PISSUES_MANAGE);
        String name = IssueValidationHelper.validateSprintName(request.name());
        String goal = IssueValidationHelper.validateSprintGoal(request.goal());
        IssueValidationHelper.validateSprintDates(request.startDate(), request.endDate());
        IssueSprintEntity entity = new IssueSprintEntity();
        entity.setWorkspaceId(workspaceId);
        entity.setProjectId(projectId);
        entity.setName(name);
        entity.setGoal(goal);
        entity.setStatus(SprintStatus.PLANNED);
        entity.setStartDate(request.startDate());
        entity.setEndDate(request.endDate());
        entity.setCreatedBy(userId);
        return toDto(sprints.save(entity), SprintMetricsAggregate.EMPTY);
    }

    @Transactional
    public SprintDto updateSprint(
        UUID userId, UUID workspaceId, UUID projectId, UUID sprintId, UpdateSprintRequest request
    ) {
        lookup.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_WRITE, Permissions.PISSUES_MANAGE);
        IssueSprintEntity sprint = loadSprint(projectId, sprintId);
        if (request.name() != null) sprint.setName(IssueValidationHelper.validateSprintName(request.name()));
        if (request.goal() != null) sprint.setGoal(IssueValidationHelper.validateSprintGoal(request.goal()));
        if (Boolean.TRUE.equals(request.clearStartDate())) sprint.setStartDate(null);
        else if (request.startDate() != null) sprint.setStartDate(request.startDate());
        if (Boolean.TRUE.equals(request.clearEndDate())) sprint.setEndDate(null);
        else if (request.endDate() != null) sprint.setEndDate(request.endDate());
        IssueValidationHelper.validateSprintDates(sprint.getStartDate(), sprint.getEndDate());

        SprintStatus targetStatus = null;
        if (request.status() != null) {
            targetStatus = IssueValidationHelper.parseSprintStatus(request.status());
            validateTransition(sprint.getStatus(), targetStatus);
            if (targetStatus == SprintStatus.ACTIVE && sprint.getStatus() != SprintStatus.ACTIVE
                && sprints.existsByProjectIdAndStatusAndIdNot(projectId, SprintStatus.ACTIVE, sprintId)) {
                throw ApiException.conflict("ACTIVE_SPRINT_EXISTS", "Another sprint is already active in this project.");
            }
            if (targetStatus == SprintStatus.COMPLETED && sprint.getStatus() != SprintStatus.COMPLETED
                && !Boolean.FALSE.equals(request.moveIncompleteToBacklog())) {
                moveIncompleteIssuesToBacklog(userId, sprint);
            }
            sprint.setStatus(targetStatus);
        }

        IssueSprintEntity saved = saveSprintGuarded(sprint, targetStatus);
        SprintMetricsAggregate metrics = issues.aggregateSprintMetricsBySprintId(sprintId)
            .orElse(SprintMetricsAggregate.EMPTY);
        return toDto(saved, metrics);
    }

    @Transactional
    public void deleteSprint(UUID userId, UUID workspaceId, UUID projectId, UUID sprintId) {
        lookup.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_DELETE, Permissions.PISSUES_MANAGE);
        IssueSprintEntity sprint = loadSprint(projectId, sprintId);
        sprints.delete(sprint);
    }

    private static void validateTransition(SprintStatus current, SprintStatus target) {
        if (current == SprintStatus.COMPLETED && target != SprintStatus.COMPLETED) {
            throw ApiException.badRequest("INVALID_SPRINT_TRANSITION", "Completed sprints cannot be reopened.");
        }
        if (current == SprintStatus.ACTIVE && target == SprintStatus.PLANNED) {
            throw ApiException.badRequest("INVALID_SPRINT_TRANSITION", "Active sprints cannot be moved back to PLANNED.");
        }
    }

    private IssueSprintEntity saveSprintGuarded(IssueSprintEntity sprint, SprintStatus targetStatus) {
        try {
            return sprints.save(sprint);
        } catch (DataIntegrityViolationException ex) {
            if (targetStatus == SprintStatus.ACTIVE) {
                throw ApiException.conflict("ACTIVE_SPRINT_EXISTS", "Another sprint is already active in this project.");
            }
            throw ex;
        }
    }

    private void moveIncompleteIssuesToBacklog(UUID userId, IssueSprintEntity sprint) {
        List<ProjectIssueEntity> sprintIssues = issues.findBySprintIdOrderByIssueNumberAsc(sprint.getId());
        List<ProjectIssueEntity> incomplete = new ArrayList<>();
        List<IssueActivityEntity> logs = new ArrayList<>();
        for (ProjectIssueEntity issue : sprintIssues) {
            if (issue.getStatus() != IssueStatus.DONE) {
                issue.setSprintId(null);
                incomplete.add(issue);
                logs.add(IssueValidationHelper.newActivity(
                    issue.getId(), userId, "SPRINT_CHANGED", "sprint", sprint.getName(), "Backlog"
                ));
            }
        }
        if (!incomplete.isEmpty()) {
            issues.saveAll(incomplete);
            activities.saveAll(logs);
        }
    }

    private IssueSprintEntity loadSprint(UUID projectId, UUID sprintId) {
        return sprints.findByIdAndProjectId(sprintId, projectId)
            .orElseThrow(() -> ApiException.notFound("SPRINT_NOT_FOUND", "Sprint not found."));
    }

    private SprintDto toDto(IssueSprintEntity sprint, SprintMetricsAggregate metrics) {
        return new SprintDto(
            sprint.getId(), sprint.getWorkspaceId(), sprint.getProjectId(),
            sprint.getName(), sprint.getGoal(), sprint.getStatus().name(),
            sprint.getStartDate(), sprint.getEndDate(),
            metrics.totalIssuesInt(), metrics.completedIssuesInt(),
            metrics.totalStoryPointsInt(), metrics.completedStoryPointsInt(),
            sprint.getCreatedAt(), sprint.getUpdatedAt()
        );
    }
}
