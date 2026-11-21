package com.orbit.issues.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.issues.dto.IssueActivityDto;
import com.orbit.issues.dto.IssueCommentDto;
import com.orbit.issues.dto.IssueDto;
import com.orbit.issues.entity.IssueActivityEntity;
import com.orbit.issues.entity.IssueCommentEntity;
import com.orbit.issues.entity.IssueSprintEntity;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.ProjectIssueEntity;
import com.orbit.issues.repository.IssueCommentRepository;
import com.orbit.issues.repository.IssueSprintRepository;
import com.orbit.issues.repository.ProjectIssueRepository;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.ProjectAccess;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.WorkspaceAccess;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Batch-resolves issue display names, counts, and DTO projections while delegating access checks. */
@Component
public class IssueLookupHelper {

    private final UserRepository users;
    private final IssueSprintRepository sprints;
    private final ProjectIssueRepository issues;
    private final IssueCommentRepository comments;
    private final IssueAccessGuard accessGuard;

    public IssueLookupHelper(
        UserRepository users, IssueSprintRepository sprints, ProjectIssueRepository issues,
        IssueCommentRepository comments, IssueAccessGuard accessGuard
    ) {
        this.users = users;
        this.sprints = sprints;
        this.issues = issues;
        this.comments = comments;
        this.accessGuard = accessGuard;
    }

    public ProjectEntity requireProjectPermission(UUID userId, UUID workspaceId, UUID projectId, String... anyOfPermissions) {
        return accessGuard.requireProjectPermission(userId, workspaceId, projectId, anyOfPermissions);
    }

    public ProjectAccess requireProjectAccessWithModule(UUID userId, UUID workspaceId, UUID projectId) {
        return accessGuard.requireProjectAccessWithModule(userId, workspaceId, projectId);
    }

    public WorkspaceAccess requireWorkspaceIssuesAccess(UUID userId, UUID workspaceId) {
        return accessGuard.requireWorkspaceIssuesAccess(userId, workspaceId);
    }

    public Map<UUID, String> resolveUserNames(Collection<UUID> userIds) {
        Set<UUID> unique = userIds.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (unique.isEmpty()) return Map.of();
        Map<UUID, String> names = new HashMap<>();
        for (UserEntity user : users.findAllById(unique)) {
            String display = user.getDisplayName();
            names.put(user.getId(), (display != null && !display.isBlank()) ? display : user.getUsername());
        }
        return names;
    }

    public Map<UUID, String> resolveSprintNames(Collection<UUID> sprintIds) {
        Set<UUID> unique = sprintIds.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (unique.isEmpty()) return Map.of();
        Map<UUID, String> names = new HashMap<>();
        for (IssueSprintEntity sprint : sprints.findAllById(unique)) {
            names.put(sprint.getId(), sprint.getName());
        }
        return names;
    }

    public IssueDto toIssueDto(ProjectIssueEntity issue, String projectName) {
        Map<UUID, String> names = projectName != null ? Map.of(issue.getProjectId(), projectName) : Map.of();
        return toIssueDtos(List.of(issue), names).get(0);
    }

    public List<IssueDto> toIssueDtos(List<ProjectIssueEntity> items, Map<UUID, String> projectNames) {
        if (items.isEmpty()) return List.of();
        Set<UUID> userIds = new HashSet<>();
        Set<UUID> sprintIds = new HashSet<>();
        Set<UUID> parentIds = new HashSet<>();
        List<UUID> issueIds = items.stream().map(ProjectIssueEntity::getId).toList();
        for (ProjectIssueEntity item : items) {
            if (item.getAssigneeId() != null) userIds.add(item.getAssigneeId());
            if (item.getReporterId() != null) userIds.add(item.getReporterId());
            if (item.getSprintId() != null) sprintIds.add(item.getSprintId());
            if (item.getParentId() != null) parentIds.add(item.getParentId());
        }
        Map<UUID, String> userNames = resolveUserNames(userIds);
        Map<UUID, String> sprintNames = resolveSprintNames(sprintIds);
        Map<UUID, String> parentKeys = resolveParentKeys(parentIds);
        Map<UUID, int[]> subtaskCounts = resolveSubtaskCounts(issueIds);
        Map<UUID, Integer> commentCounts = resolveCommentCounts(issueIds);

        return items.stream().map(item -> {
            int[] sub = subtaskCounts.getOrDefault(item.getId(), new int[] {0, 0});
            String reporterName = lookupValue(userNames, item.getReporterId());
            String projectName = lookupValue(projectNames, item.getProjectId());
            return new IssueDto(
                item.getId(), item.getWorkspaceId(), item.getProjectId(), projectName != null ? projectName : "",
                item.getIssueNumber(), item.getIssueKey(),
                item.getType().name(), item.getTitle(), item.getDescription(),
                item.getStatus().name(), item.getPriority().name(), item.getStoryPoints(),
                item.getSprintId(), lookupValue(sprintNames, item.getSprintId()),
                item.getParentId(), lookupValue(parentKeys, item.getParentId()),
                item.getAssigneeId(), lookupValue(userNames, item.getAssigneeId()),
                item.getReporterId(), reporterName != null ? reporterName : "Unknown",
                IssueValidationHelper.parseLabels(item.getLabels()), item.getDueDate(),
                sub[0], sub[1], commentCounts.getOrDefault(item.getId(), 0),
                item.getCreatedAt(), item.getUpdatedAt()
            );
        }).toList();
    }

    public List<IssueCommentDto> toCommentDtos(List<IssueCommentEntity> items) {
        if (items.isEmpty()) return List.of();
        Map<UUID, String> names = resolveUserNames(items.stream().map(IssueCommentEntity::getAuthorId).toList());
        return items.stream().map(c -> {
            String author = lookupValue(names, c.getAuthorId());
            return new IssueCommentDto(
                c.getId(), c.getIssueId(), c.getAuthorId(), author != null ? author : "Unknown",
                c.getBody(), c.getCreatedAt(), c.getUpdatedAt()
            );
        }).toList();
    }

    public List<IssueActivityDto> toActivityDtos(List<IssueActivityEntity> items) {
        if (items.isEmpty()) return List.of();
        Map<UUID, String> names = resolveUserNames(items.stream().map(IssueActivityEntity::getActorId).toList());
        return items.stream().map(a -> {
            String actor = lookupValue(names, a.getActorId());
            return new IssueActivityDto(
                a.getId(), a.getIssueId(), a.getActorId(), actor != null ? actor : "Unknown",
                a.getAction(), a.getFieldName(), a.getOldValue(), a.getNewValue(), a.getCreatedAt()
            );
        }).toList();
    }

    private Map<UUID, String> resolveParentKeys(Set<UUID> parentIds) {
        if (parentIds.isEmpty()) return Map.of();
        Map<UUID, String> keys = new HashMap<>();
        for (ProjectIssueEntity parent : issues.findAllById(parentIds)) {
            keys.put(parent.getId(), parent.getIssueKey());
        }
        return keys;
    }

    private Map<UUID, int[]> resolveSubtaskCounts(List<UUID> issueIds) {
        Map<UUID, int[]> counts = new HashMap<>();
        for (ProjectIssueEntity child : issues.findByParentIdIn(issueIds)) {
            int[] pair = counts.computeIfAbsent(child.getParentId(), k -> new int[] {0, 0});
            pair[0]++;
            if (child.getStatus() == IssueStatus.DONE) pair[1]++;
        }
        return counts;
    }

    private Map<UUID, Integer> resolveCommentCounts(List<UUID> issueIds) {
        Map<UUID, Integer> counts = new HashMap<>();
        for (Object[] row : comments.countByIssueIds(issueIds)) {
            if (row != null && row.length >= 2 && row[0] instanceof UUID id && row[1] instanceof Number num) {
                counts.put(id, num.intValue());
            }
        }
        return counts;
    }

    private static String lookupValue(Map<UUID, String> map, UUID key) {
        return key == null ? null : map.get(key);
    }
}
