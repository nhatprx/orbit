package com.orbit.git.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.git.dto.GitCollaboratorDto;
import com.orbit.git.dto.GitRepoStatsDto;
import com.orbit.git.dto.GitWorkflowRunDto;
import com.orbit.git.service.GitAccessGuard;
import com.orbit.git.service.GitInsightsService;
import com.orbit.workspace.permission.Permissions;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Exposes GitHub Actions CI/CD runs and collaborators for workspace and project Git scopes. */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}")
public class GitInsightsController {

    private final GitAccessGuard guard;
    private final GitInsightsService insights;

    public GitInsightsController(GitAccessGuard guard, GitInsightsService insights) {
        this.guard = guard;
        this.insights = insights;
    }

    @GetMapping("/git/actions")
    public List<GitWorkflowRunDto> workspaceActions(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @RequestParam(defaultValue = "15") int limit
    ) {
        return insights.listWorkflowRuns(guard.requireWorkspaceScope(principal.userId(), workspaceId, Permissions.GIT_READ), limit);
    }

    @GetMapping("/git/collaborators")
    public List<GitCollaboratorDto> workspaceCollaborators(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId
    ) {
        return insights.listCollaborators(guard.requireWorkspaceScope(principal.userId(), workspaceId, Permissions.GIT_READ));
    }

    @GetMapping("/git/stats")
    public GitRepoStatsDto workspaceStats(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId
    ) {
        return insights.getRepoStats(guard.requireWorkspaceScope(principal.userId(), workspaceId, Permissions.GIT_READ));
    }

    @GetMapping("/projects/{projectId}/git/actions")
    public List<GitWorkflowRunDto> projectActions(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @RequestParam(defaultValue = "15") int limit
    ) {
        return insights.listWorkflowRuns(
            guard.requireProjectScope(principal.userId(), workspaceId, projectId, Permissions.PGIT_READ),
            limit
        );
    }

    @GetMapping("/projects/{projectId}/git/collaborators")
    public List<GitCollaboratorDto> projectCollaborators(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId
    ) {
        return insights.listCollaborators(
            guard.requireProjectScope(principal.userId(), workspaceId, projectId, Permissions.PGIT_READ)
        );
    }

    @GetMapping("/projects/{projectId}/git/stats")
    public GitRepoStatsDto projectStats(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId
    ) {
        return insights.getRepoStats(
            guard.requireProjectScope(principal.userId(), workspaceId, projectId, Permissions.PGIT_READ)
        );
    }
}
