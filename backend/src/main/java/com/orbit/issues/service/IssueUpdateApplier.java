package com.orbit.issues.service;

import com.orbit.common.ApiException;
import com.orbit.common.InputRules;
import com.orbit.issues.dto.UpdateIssueRequest;
import com.orbit.issues.entity.IssueActivityEntity;
import com.orbit.issues.entity.IssuePriority;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.IssueType;
import com.orbit.issues.entity.ProjectIssueEntity;
import com.orbit.issues.repository.IssueSprintRepository;
import com.orbit.issues.repository.ProjectIssueRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

/** Validates and applies partial issue mutations while building corresponding audit activities. */
@Component
public class IssueUpdateApplier {

    private static final int MAX_PARENT_DEPTH = 25;

    private final ProjectIssueRepository issues;
    private final IssueSprintRepository sprints;
    private final IssueLookupHelper lookup;

    public IssueUpdateApplier(ProjectIssueRepository issues, IssueSprintRepository sprints, IssueLookupHelper lookup) {
        this.issues = issues;
        this.sprints = sprints;
        this.lookup = lookup;
    }

    public List<IssueActivityEntity> apply(UUID userId, UUID projectId, ProjectIssueEntity issue, UpdateIssueRequest req) {
        IssueStatus oldStatus = issue.getStatus();
        IssuePriority oldPriority = issue.getPriority();
        UUID oldSprintId = issue.getSprintId();
        UUID oldAssigneeId = issue.getAssigneeId();
        boolean generalEdited = applyScalarFields(issue, req);

        if (Boolean.TRUE.equals(req.clearSprint())) {
            issue.setSprintId(null);
        } else if (req.sprintId() != null) {
            sprints.findByIdAndProjectId(req.sprintId(), projectId)
                .orElseThrow(() -> ApiException.badRequest("INVALID_SPRINT", "Sprint does not belong to this project."));
            issue.setSprintId(req.sprintId());
        }
        generalEdited |= applyParentChange(projectId, issue, req);
        if (Boolean.TRUE.equals(req.clearAssignee())) {
            issue.setAssigneeId(null);
        } else if (req.assigneeId() != null) {
            issue.setAssigneeId(req.assigneeId());
        }
        return buildActivities(userId, issue, oldStatus, oldPriority, oldSprintId, oldAssigneeId, generalEdited);
    }

    public void validateParentAssignment(UUID projectId, UUID issueId, IssueType issueType, UUID parentId) {
        if (issueId != null && parentId.equals(issueId)) {
            throw ApiException.badRequest("CIRCULAR_PARENT", "An issue cannot be its own parent.");
        }
        ProjectIssueEntity parent = issues.findByIdAndProjectId(parentId, projectId)
            .orElseThrow(() -> ApiException.badRequest("INVALID_PARENT", "Parent issue does not belong to this project."));
        if (issueType == IssueType.SUBTASK && parent.getType() == IssueType.SUBTASK) {
            throw ApiException.badRequest("INVALID_PARENT", "A subtask cannot have another subtask as its parent.");
        }
        if (issueId != null) {
            UUID cursor = parent.getParentId();
            for (int hops = 0; cursor != null && hops < MAX_PARENT_DEPTH; hops++) {
                if (cursor.equals(issueId)) {
                    throw ApiException.badRequest("CIRCULAR_PARENT", "Circular parent relationship detected.");
                }
                cursor = issues.findByIdAndProjectId(cursor, projectId)
                    .map(ProjectIssueEntity::getParentId).orElse(null);
            }
        }
    }

    private boolean applyScalarFields(ProjectIssueEntity issue, UpdateIssueRequest req) {
        boolean edited = false;
        if (req.title() != null) {
            String next = IssueValidationHelper.validateTitle(req.title());
            edited |= !Objects.equals(issue.getTitle(), next);
            issue.setTitle(next);
        }
        if (req.description() != null) {
            String next = InputRules.blankToNull(req.description());
            edited |= !Objects.equals(issue.getDescription(), next);
            issue.setDescription(next);
        }
        if (req.type() != null) {
            IssueType next = IssueValidationHelper.parseType(req.type(), issue.getType());
            edited |= issue.getType() != next;
            issue.setType(next);
        }
        if (req.status() != null) issue.setStatus(IssueValidationHelper.parseStatus(req.status(), issue.getStatus()));
        if (req.priority() != null) issue.setPriority(IssueValidationHelper.parsePriority(req.priority(), issue.getPriority()));
        if (Boolean.TRUE.equals(req.clearStoryPoints())) {
            edited |= issue.getStoryPoints() != null;
            issue.setStoryPoints(null);
        } else if (req.storyPoints() != null) {
            Integer next = IssueValidationHelper.validateStoryPoints(req.storyPoints());
            edited |= !Objects.equals(issue.getStoryPoints(), next);
            issue.setStoryPoints(next);
        }
        if (req.labels() != null) {
            String next = IssueValidationHelper.serializeLabels(req.labels());
            edited |= !Objects.equals(issue.getLabels(), next);
            issue.setLabels(next);
        }
        if (Boolean.TRUE.equals(req.clearDueDate())) {
            edited |= issue.getDueDate() != null;
            issue.setDueDate(null);
        } else if (req.dueDate() != null) {
            edited |= !Objects.equals(issue.getDueDate(), req.dueDate());
            issue.setDueDate(req.dueDate());
        }
        return edited;
    }

    private boolean applyParentChange(UUID projectId, ProjectIssueEntity issue, UpdateIssueRequest req) {
        if (Boolean.TRUE.equals(req.clearParent())) {
            boolean changed = issue.getParentId() != null;
            issue.setParentId(null);
            return changed;
        }
        if (req.parentId() != null) {
            validateParentAssignment(projectId, issue.getId(), issue.getType(), req.parentId());
            boolean changed = !Objects.equals(issue.getParentId(), req.parentId());
            issue.setParentId(req.parentId());
            return changed;
        }
        if (issue.getType() == IssueType.SUBTASK && issue.getParentId() != null) {
            validateParentAssignment(projectId, issue.getId(), issue.getType(), issue.getParentId());
        }
        return false;
    }

    private List<IssueActivityEntity> buildActivities(
        UUID userId, ProjectIssueEntity issue, IssueStatus oldStatus, IssuePriority oldPriority,
        UUID oldSprintId, UUID oldAssigneeId, boolean generalEdited
    ) {
        List<IssueActivityEntity> list = new ArrayList<>();
        if (oldStatus != issue.getStatus()) {
            list.add(IssueValidationHelper.newActivity(issue.getId(), userId, "STATUS_CHANGED", "status", oldStatus.name(), issue.getStatus().name()));
        }
        if (oldPriority != issue.getPriority()) {
            list.add(IssueValidationHelper.newActivity(issue.getId(), userId, "PRIORITY_CHANGED", "priority", oldPriority.name(), issue.getPriority().name()));
        }
        if (!Objects.equals(oldSprintId, issue.getSprintId())) {
            Map<UUID, String> names = lookup.resolveSprintNames(Stream.of(oldSprintId, issue.getSprintId()).filter(Objects::nonNull).toList());
            String from = oldSprintId == null ? "Backlog" : names.getOrDefault(oldSprintId, oldSprintId.toString());
            String to = issue.getSprintId() == null ? "Backlog" : names.getOrDefault(issue.getSprintId(), issue.getSprintId().toString());
            list.add(IssueValidationHelper.newActivity(issue.getId(), userId, "SPRINT_CHANGED", "sprint", from, to));
        }
        if (!Objects.equals(oldAssigneeId, issue.getAssigneeId())) {
            Map<UUID, String> names = lookup.resolveUserNames(Stream.of(oldAssigneeId, issue.getAssigneeId()).filter(Objects::nonNull).toList());
            String from = oldAssigneeId == null ? "Unassigned" : names.getOrDefault(oldAssigneeId, oldAssigneeId.toString());
            String to = issue.getAssigneeId() == null ? "Unassigned" : names.getOrDefault(issue.getAssigneeId(), issue.getAssigneeId().toString());
            list.add(IssueValidationHelper.newActivity(issue.getId(), userId, "ASSIGNEE_CHANGED", "assignee", from, to));
        }
        if (generalEdited && list.isEmpty()) {
            list.add(IssueValidationHelper.newActivity(issue.getId(), userId, "UPDATED", null, null, null));
        }
        return list;
    }
}
