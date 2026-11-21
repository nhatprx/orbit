package com.orbit.issues.service;

import com.orbit.common.ApiException;
import com.orbit.common.InputRules;
import com.orbit.issues.dto.CreateIssueRequest;
import com.orbit.issues.dto.IssueDetailDto;
import com.orbit.issues.dto.IssueDto;
import com.orbit.issues.dto.UpdateIssueRequest;
import com.orbit.issues.entity.IssueActivityEntity;
import com.orbit.issues.entity.IssuePriority;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.IssueType;
import com.orbit.issues.entity.ProjectIssueEntity;
import com.orbit.issues.repository.IssueActivityRepository;
import com.orbit.issues.repository.IssueCommentRepository;
import com.orbit.issues.repository.IssueSprintRepository;
import com.orbit.issues.repository.OffsetLimitPageRequest;
import com.orbit.issues.repository.ProjectIssueCounterRepository;
import com.orbit.issues.repository.ProjectIssueRepository;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.workspace.permission.Permissions;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Core CRUD, bounded filtering, hierarchy validation, and audit logging for project issues. */
@Service
public class IssueService {

    private static final Sort ISSUE_NUMBER_DESC = Sort.by(Sort.Direction.DESC, "issueNumber");

    private final ProjectIssueRepository issues;
    private final ProjectIssueCounterRepository counters;
    private final IssueSprintRepository sprints;
    private final IssueCommentRepository comments;
    private final IssueActivityRepository activities;
    private final IssueLookupHelper lookup;
    private final IssueUpdateApplier updateApplier;

    public IssueService(
        ProjectIssueRepository issues,
        ProjectIssueCounterRepository counters,
        IssueSprintRepository sprints,
        IssueCommentRepository comments,
        IssueActivityRepository activities,
        IssueLookupHelper lookup,
        IssueUpdateApplier updateApplier
    ) {
        this.issues = issues;
        this.counters = counters;
        this.sprints = sprints;
        this.comments = comments;
        this.activities = activities;
        this.lookup = lookup;
        this.updateApplier = updateApplier;
    }

    @Transactional(readOnly = true)
    public List<IssueDto> listIssues(
        UUID userId, UUID workspaceId, UUID projectId,
        String type, String status, String priority,
        UUID sprintId, Boolean backlogOnly, UUID parentId, UUID assigneeId, String q,
        Integer limit, Integer offset
    ) {
        ProjectEntity project = lookup.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_READ);
        OffsetLimitPageRequest pageRequest = OffsetLimitPageRequest.of(offset, limit, ISSUE_NUMBER_DESC);
        Specification<ProjectIssueEntity> spec = IssueFilterMatcher.toSpecification(
            projectId, type, status, priority, sprintId, backlogOnly, parentId, assigneeId, q
        );
        List<ProjectIssueEntity> page = issues.findAll(spec, pageRequest).getContent();
        return lookup.toIssueDtos(page, Map.of(project.getId(), project.getName()));
    }

    @Transactional
    public IssueDto createIssue(UUID userId, UUID workspaceId, UUID projectId, CreateIssueRequest request) {
        ProjectEntity project = lookup.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_WRITE);
        String title = IssueValidationHelper.validateTitle(request.title());
        IssueType type = IssueValidationHelper.parseType(request.type(), IssueType.TASK);
        IssueStatus status = IssueValidationHelper.parseStatus(request.status(), IssueStatus.TODO);
        IssuePriority priority = IssueValidationHelper.parsePriority(request.priority(), IssuePriority.MEDIUM);
        Integer storyPoints = IssueValidationHelper.validateStoryPoints(request.storyPoints());
        String labels = IssueValidationHelper.serializeLabels(request.labels());

        if (request.sprintId() != null) {
            sprints.findByIdAndProjectId(request.sprintId(), projectId)
                .orElseThrow(() -> ApiException.badRequest("INVALID_SPRINT", "Sprint does not belong to this project."));
        }
        if (request.parentId() != null) {
            updateApplier.validateParentAssignment(projectId, null, type, request.parentId());
        }
        lookup.requireValidAssignee(workspaceId, projectId, request.assigneeId());

        int issueNumber = counters.incrementAndGet(projectId);
        String issueKey = IssueKeyGenerator.formatKey(project.getSlug(), project.getName(), issueNumber);

        ProjectIssueEntity entity = new ProjectIssueEntity();
        entity.setWorkspaceId(workspaceId);
        entity.setProjectId(projectId);
        entity.setIssueNumber(issueNumber);
        entity.setIssueKey(issueKey);
        entity.setType(type);
        entity.setTitle(title);
        entity.setDescription(InputRules.blankToNull(request.description()));
        entity.setStatus(status);
        entity.setPriority(priority);
        entity.setStoryPoints(storyPoints);
        entity.setSprintId(request.sprintId());
        entity.setParentId(request.parentId());
        entity.setAssigneeId(request.assigneeId());
        entity.setReporterId(userId);
        entity.setLabels(labels);
        entity.setDueDate(request.dueDate());

        ProjectIssueEntity saved = issues.save(entity);
        activities.save(IssueValidationHelper.newActivity(saved.getId(), userId, "CREATED", null, null, saved.getIssueKey()));
        if (saved.getParentId() != null) {
            activities.save(IssueValidationHelper.newActivity(
                saved.getParentId(), userId, "SUBTASK_ADDED", "subtask", null, saved.getIssueKey()
            ));
        }
        return lookup.toIssueDto(saved, project.getName());
    }

    @Transactional(readOnly = true)
    public IssueDetailDto getIssueDetail(UUID userId, UUID workspaceId, UUID projectId, UUID issueId) {
        ProjectEntity project = lookup.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_READ);
        ProjectIssueEntity issue = loadIssue(projectId, issueId);
        List<ProjectIssueEntity> subtasks = issues.findByParentIdOrderByIssueNumberAsc(issueId);
        Map<UUID, String> projectNames = Map.of(project.getId(), project.getName());

        return new IssueDetailDto(
            lookup.toIssueDto(issue, project.getName()),
            lookup.toIssueDtos(subtasks, projectNames),
            lookup.toCommentDtos(comments.findByIssueIdOrderByCreatedAtAsc(issueId)),
            lookup.toActivityDtos(activities.findByIssueIdOrderByCreatedAtDesc(issueId))
        );
    }

    @Transactional
    public IssueDto updateIssue(UUID userId, UUID workspaceId, UUID projectId, UUID issueId, UpdateIssueRequest request) {
        ProjectEntity project = lookup.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_WRITE);
        ProjectIssueEntity issue = loadIssue(projectId, issueId);
        List<IssueActivityEntity> newActivities = updateApplier.apply(userId, projectId, issue, request);
        ProjectIssueEntity saved = issues.save(issue);
        if (!newActivities.isEmpty()) {
            activities.saveAll(newActivities);
        }
        return lookup.toIssueDto(saved, project.getName());
    }

    @Transactional
    public void deleteIssue(UUID userId, UUID workspaceId, UUID projectId, UUID issueId) {
        lookup.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_DELETE);
        ProjectIssueEntity issue = loadIssue(projectId, issueId);
        issues.delete(issue);
    }

    private ProjectIssueEntity loadIssue(UUID projectId, UUID issueId) {
        return issues.findByIdAndProjectId(issueId, projectId)
            .orElseThrow(() -> ApiException.notFound("ISSUE_NOT_FOUND", "Issue not found."));
    }
}
