package com.orbit.issues;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import com.orbit.issues.dto.ProjectIssueSummaryDto;
import com.orbit.issues.dto.WorkspaceIssuePortfolioDto;
import com.orbit.issues.entity.IssuePriority;
import com.orbit.issues.entity.IssueSprintEntity;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.IssueType;
import com.orbit.issues.entity.ProjectIssueEntity;
import com.orbit.issues.entity.SprintStatus;
import com.orbit.issues.repository.IssueCommentRepository;
import com.orbit.issues.repository.IssueSprintRepository;
import com.orbit.issues.repository.OffsetLimitPageRequest;
import com.orbit.issues.repository.ProjectIssueAggregate;
import com.orbit.issues.repository.ProjectIssueRepository;
import com.orbit.issues.service.IssueAccessGuard;
import com.orbit.issues.service.IssueLookupHelper;
import com.orbit.issues.service.WorkspaceIssuePortfolioService;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.WorkspaceAccess;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

class WorkspaceIssuePortfolioServiceTest {

    private final UUID userId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();

    private ProjectRepository projects;
    private ProjectIssueRepository issues;
    private IssueSprintRepository sprints;
    private IssueAccessGuard accessGuard;
    private WorkspaceIssuePortfolioService service;

    @BeforeEach
    void setUp() {
        projects = mock(ProjectRepository.class);
        issues = mock(ProjectIssueRepository.class);
        sprints = mock(IssueSprintRepository.class);
        accessGuard = mock(IssueAccessGuard.class);
        UserRepository users = mock(UserRepository.class);
        IssueCommentRepository comments = mock(IssueCommentRepository.class);

        when(users.findAllById(any())).thenReturn(List.of());
        when(sprints.findAllById(any())).thenReturn(List.of());
        when(issues.findAllById(any())).thenReturn(List.of());
        when(issues.findByParentIdIn(anyCollection())).thenReturn(List.of());
        when(comments.countByIssueIds(anyCollection())).thenReturn(List.of());

        IssueLookupHelper lookup = new IssueLookupHelper(users, sprints, issues, comments, accessGuard);
        service = new WorkspaceIssuePortfolioService(projects, issues, sprints, lookup);
    }

    @Test
    void aggregatesSqlCountsForAuthorizedProjectsWithBoundedPagination() {
        WorkspaceAccess access = new WorkspaceAccess(true, true, true, Set.of(Permissions.WORKSPACE_VIEW, Permissions.ISSUES_READ));
        when(accessGuard.requireWorkspaceIssuesAccess(userId, workspaceId)).thenReturn(access);

        ProjectEntity alpha = project("Alpha", "alpha");
        ProjectEntity beta = project("Beta", "beta");
        ProjectEntity disabled = project("Disabled", "disabled");
        when(projects.findByWorkspaceIdAndDeletedAtIsNull(eq(workspaceId), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(alpha, beta, disabled)));
        when(accessGuard.filterReadableIssueProjects(userId, access, List.of(alpha, beta, disabled)))
            .thenReturn(List.of(alpha, beta));

        when(issues.summarizeByProjectIds(List.of(alpha.getId(), beta.getId()))).thenReturn(List.of(
            new ProjectIssueAggregate(alpha.getId(), 4L, 1L, 1L, 1L, 0L, 1L, 1L),
            new ProjectIssueAggregate(beta.getId(), 26L, 0L, 0L, 0L, 26L, 0L, 0L)
        ));
        when(issues.findByProjectIdInOrderByUpdatedAtDesc(eq(List.of(alpha.getId(), beta.getId())), any(Pageable.class)))
            .thenReturn(List.of(issue(alpha.getId(), 2, IssueStatus.TODO, IssuePriority.CRITICAL)));

        IssueSprintEntity active = new IssueSprintEntity();
        active.setId(UUID.randomUUID());
        active.setProjectId(alpha.getId());
        active.setName("Sprint Alpha 1");
        active.setStatus(SprintStatus.ACTIVE);
        when(sprints.findByProjectIdInAndStatus(List.of(alpha.getId(), beta.getId()), SprintStatus.ACTIVE))
            .thenReturn(List.of(active));

        WorkspaceIssuePortfolioDto portfolio = service.getPortfolio(userId, workspaceId, 1000, 5);
        ArgumentCaptor<Pageable> projectPage = ArgumentCaptor.forClass(Pageable.class);
        verify(projects).findByWorkspaceIdAndDeletedAtIsNull(eq(workspaceId), projectPage.capture());
        assertEquals(OffsetLimitPageRequest.MAX_LIMIT, projectPage.getValue().getPageSize());
        assertEquals(5L, projectPage.getValue().getOffset());

        assertEquals(30, portfolio.totalIssues());
        assertEquals(2, portfolio.openIssues());
        assertEquals(27, portfolio.inProgressIssues());
        assertEquals(1, portfolio.doneIssues());
        assertEquals(1, portfolio.criticalIssues());
        assertEquals(1, portfolio.activeSprintsCount());
        assertEquals(2, portfolio.projects().size());
        assertEquals(1, portfolio.recentIssues().size());

        ProjectIssueSummaryDto alphaSummary = portfolio.projects().get(0);
        assertEquals("Sprint Alpha 1", alphaSummary.activeSprintName());
        assertEquals(25, alphaSummary.completionPercent());
        assertNull(portfolio.projects().get(1).activeSprintName());
    }

    @Test
    void scopesRegularMemberAndValidatesPaginationBounds() {
        WorkspaceAccess access = new WorkspaceAccess(true, true, false, Set.of(Permissions.WORKSPACE_VIEW, Permissions.ISSUES_READ));
        when(accessGuard.requireWorkspaceIssuesAccess(userId, workspaceId)).thenReturn(access);
        when(projects.findMemberProjects(eq(workspaceId), eq(userId), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of()));
        when(accessGuard.filterReadableIssueProjects(userId, access, List.of())).thenReturn(List.of());

        WorkspaceIssuePortfolioDto empty = service.getPortfolio(userId, workspaceId, null, null);
        assertEquals(0, empty.totalIssues());
        assertTrue(empty.projects().isEmpty());
        verify(issues, never()).summarizeByProjectIds(any());

        assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class, () ->
            service.getPortfolio(userId, workspaceId, 0, 0)
        ).getCode());
        assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class, () ->
            service.getPortfolio(userId, workspaceId, 50, -2)
        ).getCode());
    }

    private ProjectEntity project(String name, String slug) {
        ProjectEntity p = new ProjectEntity();
        p.setId(UUID.randomUUID());
        p.setWorkspaceId(workspaceId);
        p.setName(name);
        p.setSlug(slug);
        return p;
    }

    private ProjectIssueEntity issue(UUID projectId, int number, IssueStatus status, IssuePriority priority) {
        ProjectIssueEntity e = new ProjectIssueEntity();
        e.setId(UUID.randomUUID());
        e.setWorkspaceId(workspaceId);
        e.setProjectId(projectId);
        e.setIssueNumber(number);
        e.setIssueKey("PR-" + number);
        e.setType(IssueType.TASK);
        e.setTitle("Issue " + number);
        e.setStatus(status);
        e.setPriority(priority);
        e.setReporterId(userId);
        return e;
    }
}
