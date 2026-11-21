package com.orbit.issues;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import com.orbit.issues.dto.CreateIssueRequest;
import com.orbit.issues.dto.IssueDetailDto;
import com.orbit.issues.dto.IssueDto;
import com.orbit.issues.entity.IssueActivityEntity;
import com.orbit.issues.entity.IssuePriority;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.IssueType;
import com.orbit.issues.entity.ProjectIssueEntity;
import com.orbit.issues.repository.IssueActivityRepository;
import com.orbit.issues.repository.IssueCommentRepository;
import com.orbit.issues.repository.IssueSprintRepository;
import com.orbit.issues.repository.ProjectIssueRepository;
import com.orbit.issues.service.IssueAccessGuard;
import com.orbit.issues.service.IssueLookupHelper;
import com.orbit.issues.service.IssueService;
import com.orbit.issues.service.IssueUpdateApplier;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.workspace.permission.Permissions;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class IssueServiceTest {

    private final UUID userId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();

    private ProjectIssueRepository issues;
    private IssueSprintRepository sprints;
    private IssueCommentRepository comments;
    private IssueActivityRepository activities;
    private IssueService service;

    @BeforeEach
    void setUp() {
        issues = mock(ProjectIssueRepository.class);
        sprints = mock(IssueSprintRepository.class);
        comments = mock(IssueCommentRepository.class);
        activities = mock(IssueActivityRepository.class);
        UserRepository users = mock(UserRepository.class);
        IssueAccessGuard accessGuard = mock(IssueAccessGuard.class);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setWorkspaceId(workspaceId);
        project.setName("Project Alpha");
        project.setSlug("project-alpha");

        when(accessGuard.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_READ)).thenReturn(project);
        when(accessGuard.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_WRITE)).thenReturn(project);
        when(accessGuard.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_DELETE)).thenReturn(project);
        when(issues.save(any())).thenAnswer(inv -> {
            ProjectIssueEntity e = inv.getArgument(0);
            if (e.getId() == null) e.setId(UUID.randomUUID());
            return e;
        });
        when(issues.findByParentIdIn(anyCollection())).thenReturn(List.of());
        when(comments.countByIssueIds(anyCollection())).thenReturn(List.of());

        UserEntity reporter = new UserEntity();
        reporter.setId(userId);
        reporter.setDisplayName("Alice Dev");
        when(users.findAllById(any())).thenReturn(List.of(reporter));

        IssueLookupHelper lookup = new IssueLookupHelper(users, sprints, issues, comments, accessGuard);
        service = new IssueService(issues, sprints, comments, activities, lookup, new IssueUpdateApplier(issues, sprints, lookup));
    }

    @Test
    void createIssueAssignsKeyAndLogsCreatedAndSubtaskAddedActivities() {
        UUID parentId = UUID.randomUUID();
        ProjectIssueEntity parent = issue(parentId, 5, "PA-5", IssueType.STORY, IssueStatus.TODO, IssuePriority.HIGH);
        when(issues.findByIdAndProjectId(parentId, projectId)).thenReturn(Optional.of(parent));
        when(issues.findAllById(any())).thenReturn(List.of(parent));
        when(issues.findMaxIssueNumberByProjectId(projectId)).thenReturn(5);

        IssueDto dto = service.createIssue(userId, workspaceId, projectId, new CreateIssueRequest(
            "SUBTASK", "Write migration tests", "Check constraints", "TODO", "HIGH", 3,
            null, parentId, null, List.of("backend", "qa"), null
        ));

        assertEquals(6, dto.issueNumber());
        assertEquals("PA-6", dto.issueKey());
        assertEquals("PA-5", dto.parentKey());
        assertEquals("Alice Dev", dto.reporterName());
        assertEquals(List.of("backend", "qa"), dto.labels());

        ArgumentCaptor<IssueActivityEntity> captor = ArgumentCaptor.forClass(IssueActivityEntity.class);
        verify(activities, times(2)).save(captor.capture());
        assertEquals(List.of("CREATED", "SUBTASK_ADDED"), captor.getAllValues().stream().map(IssueActivityEntity::getAction).toList());
    }

    @Test
    void createIssueValidatesBoundsSprintParentAndSubtaskNesting() {
        assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class, () -> service.createIssue(
            userId, workspaceId, projectId, new CreateIssueRequest("TASK", "   ", null, null, null, null, null, null, null, null, null)
        )).getCode());
        assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class, () -> service.createIssue(
            userId, workspaceId, projectId, new CreateIssueRequest("TASK", "Ok", null, null, null, 101, null, null, null, null, null)
        )).getCode());
        assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class, () -> service.createIssue(
            userId, workspaceId, projectId, new CreateIssueRequest("UNKNOWN", "Ok", null, null, null, 5, null, null, null, null, null)
        )).getCode());

        UUID badSprint = UUID.randomUUID();
        when(sprints.findByIdAndProjectId(badSprint, projectId)).thenReturn(Optional.empty());
        assertEquals("INVALID_SPRINT", assertThrows(ApiException.class, () -> service.createIssue(
            userId, workspaceId, projectId, new CreateIssueRequest("TASK", "Ok", null, null, null, null, badSprint, null, null, null, null)
        )).getCode());

        UUID subParentId = UUID.randomUUID();
        ProjectIssueEntity subParent = issue(subParentId, 1, "PA-1", IssueType.SUBTASK, IssueStatus.TODO, IssuePriority.LOW);
        when(issues.findByIdAndProjectId(subParentId, projectId)).thenReturn(Optional.of(subParent));
        assertEquals("INVALID_PARENT", assertThrows(ApiException.class, () -> service.createIssue(
            userId, workspaceId, projectId, new CreateIssueRequest("SUBTASK", "Child", null, null, null, null, null, subParentId, null, null, null)
        )).getCode());
    }

    @Test
    void listFiltersDetailAndDeleteWorkEndToEnd() {
        UUID sprintId = UUID.randomUUID();
        ProjectIssueEntity a = issue(UUID.randomUUID(), 2, "PA-2", IssueType.BUG, IssueStatus.IN_PROGRESS, IssuePriority.CRITICAL);
        a.setTitle("Fix token refresh");
        a.setSprintId(sprintId);
        ProjectIssueEntity b = issue(UUID.randomUUID(), 1, "PA-1", IssueType.TASK, IssueStatus.BACKLOG, IssuePriority.LOW);
        b.setTitle("Docs update");
        when(issues.findByProjectIdOrderByIssueNumberDesc(projectId)).thenReturn(List.of(a, b));
        when(issues.findByIdAndProjectId(a.getId(), projectId)).thenReturn(Optional.of(a));
        when(issues.findByParentIdOrderByIssueNumberAsc(a.getId())).thenReturn(List.of(b));
        when(comments.findByIssueIdOrderByCreatedAtAsc(a.getId())).thenReturn(List.of());
        when(activities.findByIssueIdOrderByCreatedAtDesc(a.getId())).thenReturn(List.of());

        List<IssueDto> bugs = service.listIssues(userId, workspaceId, projectId, "BUG", "IN_PROGRESS", "CRITICAL", sprintId, false, null, null, "token");
        assertEquals(1, bugs.size());
        assertEquals("PA-2", bugs.get(0).issueKey());

        List<IssueDto> backlog = service.listIssues(userId, workspaceId, projectId, null, null, null, null, true, null, null, null);
        assertEquals(1, backlog.size());
        assertEquals("PA-1", backlog.get(0).issueKey());

        IssueDetailDto detail = service.getIssueDetail(userId, workspaceId, projectId, a.getId());
        assertEquals("PA-2", detail.issue().issueKey());
        assertEquals(1, detail.subtasks().size());

        service.deleteIssue(userId, workspaceId, projectId, a.getId());
        verify(issues).delete(a);
    }

    private ProjectIssueEntity issue(UUID id, int num, String key, IssueType type, IssueStatus status, IssuePriority priority) {
        ProjectIssueEntity e = new ProjectIssueEntity();
        e.setId(id);
        e.setWorkspaceId(workspaceId);
        e.setProjectId(projectId);
        e.setIssueNumber(num);
        e.setIssueKey(key);
        e.setType(type);
        e.setTitle("Issue " + num);
        e.setStatus(status);
        e.setPriority(priority);
        e.setReporterId(userId);
        return e;
    }
}
