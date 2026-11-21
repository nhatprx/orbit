package com.orbit.issues;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import com.orbit.issues.dto.CreateIssueCommentRequest;
import com.orbit.issues.dto.IssueCommentDto;
import com.orbit.issues.entity.IssueActivityEntity;
import com.orbit.issues.entity.IssueCommentEntity;
import com.orbit.issues.entity.ProjectIssueEntity;
import com.orbit.issues.repository.IssueActivityRepository;
import com.orbit.issues.repository.IssueCommentRepository;
import com.orbit.issues.repository.IssueSprintRepository;
import com.orbit.issues.repository.ProjectIssueRepository;
import com.orbit.issues.service.IssueAccessGuard;
import com.orbit.issues.service.IssueCommentService;
import com.orbit.issues.service.IssueLookupHelper;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.ProjectAccess;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.WorkspaceAccess;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

class IssueCommentAndAccessTest {

    private final UUID authorId = UUID.randomUUID();
    private final UUID otherUserId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();
    private final UUID issueId = UUID.randomUUID();

    @Test
    void addAndDeleteCommentEnforcesAuthorWriteOrManagePermissions() {
        ProjectIssueRepository issues = mock(ProjectIssueRepository.class);
        IssueCommentRepository comments = mock(IssueCommentRepository.class);
        IssueActivityRepository activities = mock(IssueActivityRepository.class);
        UserRepository users = mock(UserRepository.class);
        IssueAccessGuard guard = mock(IssueAccessGuard.class);

        ProjectIssueEntity issue = new ProjectIssueEntity();
        issue.setId(issueId);
        issue.setProjectId(projectId);
        when(issues.findByIdAndProjectId(issueId, projectId)).thenReturn(Optional.of(issue));
        when(comments.save(any())).thenAnswer(inv -> {
            IssueCommentEntity c = inv.getArgument(0);
            if (c.getId() == null) c.setId(UUID.randomUUID());
            return c;
        });

        UserEntity author = new UserEntity();
        author.setId(authorId);
        author.setDisplayName("Author One");
        when(users.findAllById(any())).thenReturn(List.of(author));

        IssueLookupHelper lookup = new IssueLookupHelper(
            users, mock(IssueSprintRepository.class), issues, comments, guard
        );
        IssueCommentService service = new IssueCommentService(issues, comments, activities, lookup);

        IssueCommentDto created = service.addComment(authorId, workspaceId, projectId, issueId, new CreateIssueCommentRequest("  Looks good  "));
        assertEquals("Looks good", created.body());
        assertEquals("Author One", created.authorName());
        ArgumentCaptor<IssueActivityEntity> actCaptor = ArgumentCaptor.forClass(IssueActivityEntity.class);
        verify(activities).save(actCaptor.capture());
        assertEquals("COMMENT_ADDED", actCaptor.getValue().getAction());

        assertEquals("VALIDATION_ERROR", assertThrows(ApiException.class, () ->
            service.addComment(authorId, workspaceId, projectId, issueId, new CreateIssueCommentRequest("   "))
        ).getCode());

        UUID commentId = UUID.randomUUID();
        IssueCommentEntity comment = new IssueCommentEntity();
        comment.setId(commentId);
        comment.setIssueId(issueId);
        comment.setAuthorId(authorId);
        when(comments.findByIdAndIssueId(commentId, issueId)).thenReturn(Optional.of(comment));

        WorkspaceAccess ws = new WorkspaceAccess(true, true, false, Set.of(Permissions.WORKSPACE_VIEW));
        when(guard.requireProjectAccessWithModule(otherUserId, workspaceId, projectId))
            .thenReturn(new ProjectAccess(ws, Set.of(Permissions.PISSUES_WRITE)));
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class, () ->
            service.deleteComment(otherUserId, workspaceId, projectId, issueId, commentId)
        ).getStatus());

        when(guard.requireProjectAccessWithModule(authorId, workspaceId, projectId))
            .thenReturn(new ProjectAccess(ws, Set.of(Permissions.PISSUES_READ)));
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class, () ->
            service.deleteComment(authorId, workspaceId, projectId, issueId, commentId)
        ).getStatus());

        when(guard.requireProjectAccessWithModule(otherUserId, workspaceId, projectId))
            .thenReturn(new ProjectAccess(ws, Set.of(Permissions.PISSUES_MANAGE)));
        service.deleteComment(otherUserId, workspaceId, projectId, issueId, commentId);
        verify(comments).delete(comment);
    }

    @Test
    void accessGuardEnforcesModuleEnablementAndPermissions() {
        ProjectRepository projects = mock(ProjectRepository.class);
        ProjectModuleRepository projectModules = mock(ProjectModuleRepository.class);
        WorkspaceModuleService workspaceModules = mock(WorkspaceModuleService.class);
        WorkspacePermissionEvaluator evaluator = mock(WorkspacePermissionEvaluator.class);
        IssueAccessGuard guard = new IssueAccessGuard(projects, projectModules, workspaceModules, evaluator);

        WorkspaceAccess wsAccess = new WorkspaceAccess(true, true, false, Set.of(Permissions.WORKSPACE_VIEW));
        when(evaluator.requireProjectAccess(authorId, workspaceId, projectId))
            .thenReturn(new ProjectAccess(wsAccess, Set.of(Permissions.PISSUES_READ)));
        when(projectModules.findEffectiveEnabled(List.of(projectId))).thenReturn(List.of());
        assertEquals("MODULE_DISABLED", assertThrows(ApiException.class, () ->
            guard.requireProjectPermission(authorId, workspaceId, projectId, Permissions.PISSUES_READ)
        ).getCode());

        when(projectModules.findEffectiveEnabled(List.of(projectId)))
            .thenReturn(List.of(new KeyValue(projectId, "issues")));
        assertEquals("FORBIDDEN", assertThrows(ApiException.class, () ->
            guard.requireProjectPermission(authorId, workspaceId, projectId, Permissions.PISSUES_WRITE)
        ).getCode());

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        when(projects.findByIdAndWorkspaceIdAndDeletedAtIsNull(projectId, workspaceId)).thenReturn(Optional.of(project));
        assertEquals(projectId, guard.requireProjectPermission(authorId, workspaceId, projectId, Permissions.PISSUES_READ).getId());

        when(evaluator.requireWorkspaceAccess(authorId, workspaceId)).thenReturn(wsAccess);
        when(workspaceModules.enabledKeys(workspaceId)).thenReturn(Set.of("chat"));
        assertEquals("MODULE_DISABLED", assertThrows(ApiException.class, () ->
            guard.requireWorkspaceIssuesAccess(authorId, workspaceId)
        ).getCode());
    }
}
