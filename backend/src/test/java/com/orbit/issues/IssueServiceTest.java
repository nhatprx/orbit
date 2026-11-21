package com.orbit.issues;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.doThrow;
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
import com.orbit.issues.repository.OffsetLimitPageRequest;
import com.orbit.issues.repository.ProjectIssueCounterRepository;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;

class IssueServiceTest {

    private final UUID userId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();

    private ProjectIssueRepository issues;
    private ProjectIssueCounterRepository counters;
    private IssueSprintRepository sprints;
    private IssueCommentRepository comments;
    private IssueActivityRepository activities;
    private IssueAccessGuard accessGuard;
    private IssueService service;

    @BeforeEach
    void setUp() {
        issues = mock(ProjectIssueRepository.class);
        counters = mock(ProjectIssueCounterRepository.class);
        sprints = mock(IssueSprintRepository.class);
        comments = mock(IssueCommentRepository.class);
        activities = mock(IssueActivityRepository.class);
        UserRepository users = mock(UserRepository.class);
        accessGuard = mock(IssueAccessGuard.class);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId); project.setWorkspaceId(workspaceId);
        project.setName("Project Alpha"); project.setSlug("project-alpha");

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
        reporter.setId(userId); reporter.setDisplayName("Alice Dev");
        when(users.findAllById(any())).thenReturn(List.of(reporter));

        IssueLookupHelper lookup = new IssueLookupHelper(users, sprints, issues, comments, accessGuard);
        service = new IssueService(issues, counters, sprints, comments, activities, lookup, new IssueUpdateApplier(issues, sprints, lookup));
    }

    @Test
    void createIssueUsesAtomicCounterAndLogsCreatedAndSubtaskAddedActivities() {
        UUID parentId = UUID.randomUUID();
        ProjectIssueEntity parent = issue(parentId, 5, "PA-5", IssueType.STORY, IssueStatus.TODO, IssuePriority.HIGH);
        when(issues.findByIdAndProjectId(parentId, projectId)).thenReturn(Optional.of(parent));
        when(issues.findAllById(any())).thenReturn(List.of(parent));
        when(counters.incrementAndGet(projectId)).thenReturn(6);

        IssueDto dto = service.createIssue(userId, workspaceId, projectId, new CreateIssueRequest(
            "SUBTASK", "Write migration tests", "Check constraints", "TODO", "HIGH", 3,
            null, parentId, userId, List.of("backend", "qa"), null
        ));

        assertEquals(6, dto.issueNumber());
        assertEquals("PA-6", dto.issueKey());
        assertEquals("PA-5", dto.parentKey());
        assertEquals("Alice Dev", dto.reporterName());
        assertEquals(List.of("backend", "qa"), dto.labels());
        verify(counters).incrementAndGet(projectId);
        verify(accessGuard).requireValidAssignee(workspaceId, projectId, userId);
        ArgumentCaptor<IssueActivityEntity> captor = ArgumentCaptor.forClass(IssueActivityEntity.class);
        verify(activities, times(2)).save(captor.capture());
        assertEquals(List.of("CREATED", "SUBTASK_ADDED"), captor.getAllValues().stream().map(IssueActivityEntity::getAction).toList());
    }

    @Test
    void createIssueValidatesBoundsSprintParentSubtaskNestingAndAssignee() {
        assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class, () -> service.createIssue(
            userId, workspaceId, projectId, new CreateIssueRequest("TASK", "   ", null, null, null, null, null, null, null, null, null)
        )).getCode());
        assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class, () -> service.createIssue(
            userId, workspaceId, projectId, new CreateIssueRequest("TASK", "Ok", null, null, null, 101, null, null, null, null, null)
        )).getCode());
        UUID badSprint = UUID.randomUUID();
        when(sprints.findByIdAndProjectId(badSprint, projectId)).thenReturn(Optional.empty());
        assertEquals("INVALID_SPRINT", assertThrows(ApiException.class, () -> service.createIssue(
            userId, workspaceId, projectId, new CreateIssueRequest("TASK", "Ok", null, null, null, null, badSprint, null, null, null, null)
        )).getCode());
        UUID outsider = UUID.randomUUID();
        doThrow(ApiException.badRequest("INVALID_ASSIGNEE", "Not a member."))
            .when(accessGuard).requireValidAssignee(workspaceId, projectId, outsider);
        ApiException assigneeErr = assertThrows(ApiException.class, () -> service.createIssue(
            userId, workspaceId, projectId, new CreateIssueRequest("TASK", "Ok", null, null, null, null, null, null, outsider, null, null)
        ));
        assertEquals(HttpStatus.BAD_REQUEST, assigneeErr.getStatus());
        assertEquals("INVALID_ASSIGNEE", assigneeErr.getCode());
    }

    @Test
    @SuppressWarnings("unchecked")
    void listIssuesEnforcesBoundedPaginationAndDetailAndDeleteWork() {
        ProjectIssueEntity a = issue(UUID.randomUUID(), 2, "PA-2", IssueType.BUG, IssueStatus.IN_PROGRESS, IssuePriority.CRITICAL);
        when(issues.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(a)));
        when(issues.findByIdAndProjectId(a.getId(), projectId)).thenReturn(Optional.of(a));
        when(issues.findByParentIdOrderByIssueNumberAsc(a.getId())).thenReturn(List.of());
        when(comments.findByIssueIdOrderByCreatedAtAsc(a.getId())).thenReturn(List.of());
        when(activities.findByIssueIdOrderByCreatedAtDesc(a.getId())).thenReturn(List.of());

        List<IssueDto> clamped = service.listIssues(
            userId, workspaceId, projectId, "BUG", "IN_PROGRESS", "CRITICAL", null, false, null, null, "token", 9999, 10
        );
        assertEquals(1, clamped.size());
        ArgumentCaptor<Pageable> pageCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(issues).findAll(any(Specification.class), pageCaptor.capture());
        assertEquals(OffsetLimitPageRequest.MAX_LIMIT, pageCaptor.getValue().getPageSize());
        assertEquals(10L, pageCaptor.getValue().getOffset());

        assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class, () ->
            service.listIssues(userId, workspaceId, projectId, null, null, null, null, null, null, null, null, 0, 0)
        ).getCode());
        assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class, () ->
            service.listIssues(userId, workspaceId, projectId, null, null, null, null, null, null, null, null, 50, -1)
        ).getCode());

        IssueDetailDto detail = service.getIssueDetail(userId, workspaceId, projectId, a.getId());
        assertEquals("PA-2", detail.issue().issueKey());
        service.deleteIssue(userId, workspaceId, projectId, a.getId());
        verify(issues).delete(a);
    }

    private ProjectIssueEntity issue(UUID id, int num, String key, IssueType type, IssueStatus status, IssuePriority priority) {
        ProjectIssueEntity e = new ProjectIssueEntity();
        e.setId(id); e.setWorkspaceId(workspaceId); e.setProjectId(projectId);
        e.setIssueNumber(num); e.setIssueKey(key); e.setType(type);
        e.setTitle("Issue " + num); e.setStatus(status); e.setPriority(priority); e.setReporterId(userId);
        return e;
    }
}
