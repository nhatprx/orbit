package com.orbit.git.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.git.service.GitAccessGuard;
import com.orbit.git.service.GitCollaboratorInviteService;
import com.orbit.git.service.GitCollaboratorInviteService.InviteCollaboratorRequest;
import com.orbit.git.service.GitCollaboratorInviteService.InviteCollaboratorResultDto;
import com.orbit.git.service.GitCollaboratorInviteService.WorkspaceMemberCandidateDto;
import com.orbit.workspace.permission.Permissions;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Lists workspace GitHub collaborator candidates and sends GitHub collaborator invitations. */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}")
public class GitCollaboratorInviteController {

    private final GitAccessGuard guard;
    private final GitCollaboratorInviteService inviteService;

    public GitCollaboratorInviteController(GitAccessGuard guard, GitCollaboratorInviteService inviteService) {
        this.guard = guard;
        this.inviteService = inviteService;
    }

    @GetMapping("/git/collaborator-candidates")
    public List<WorkspaceMemberCandidateDto> workspaceCandidates(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId
    ) {
        return inviteService.listWorkspaceCandidates(
            guard.requireWorkspaceScope(principal.userId(), workspaceId, Permissions.GIT_MANAGE)
        );
    }

    @PostMapping("/git/collaborators/invite")
    public InviteCollaboratorResultDto inviteWorkspaceCollaborator(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @RequestBody InviteCollaboratorRequest request
    ) {
        return inviteService.inviteCollaborator(
            guard.requireWorkspaceScope(principal.userId(), workspaceId, Permissions.GIT_MANAGE),
            request
        );
    }

    @GetMapping("/projects/{projectId}/git/collaborator-candidates")
    public List<WorkspaceMemberCandidateDto> projectCandidates(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId
    ) {
        return inviteService.listWorkspaceCandidates(
            guard.requireProjectScope(principal.userId(), workspaceId, projectId, Permissions.PGIT_MANAGE)
        );
    }

    @PostMapping("/projects/{projectId}/git/collaborators/invite")
    public InviteCollaboratorResultDto inviteProjectCollaborator(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @RequestBody InviteCollaboratorRequest request
    ) {
        return inviteService.inviteCollaborator(
            guard.requireProjectScope(principal.userId(), workspaceId, projectId, Permissions.PGIT_MANAGE),
            request
        );
    }
}
