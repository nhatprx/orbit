package com.orbit.git.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.git.dto.*;
import com.orbit.git.service.GitAccessGuard;
import com.orbit.workspace.permission.Permissions;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Workspace-scoped GitHub Git REST API endpoints. */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/git")
public class WorkspaceGitController {

    private final GitAccessGuard guard;
    private final GitControllerSupport support;

    public WorkspaceGitController(GitAccessGuard guard, GitControllerSupport support) {
        this.guard = guard;
        this.support = support;
    }

    @PostMapping("/inspect-token")
    public InspectGitTokenResponse inspectToken(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestBody InspectGitTokenRequest req
    ) {
        return support.inspectToken(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_MANAGE), req);
    }

    @GetMapping("/repository")
    public GitRepositoryDto getRepository(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId) {
        return support.getRepository(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_READ));
    }

    @PostMapping("/repository/connect")
    @ResponseStatus(HttpStatus.CREATED)
    public GitRepositoryDto connectRepository(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestBody ConnectGitRepoRequest req
    ) {
        return support.connectRepository(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_MANAGE), p.userId(), req);
    }

    @PostMapping("/repository/create")
    @ResponseStatus(HttpStatus.CREATED)
    public GitRepositoryDto createRepository(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestBody CreateGitRepoRequest req
    ) {
        return support.createRepository(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_MANAGE), p.userId(), req);
    }

    @PatchMapping("/repository/token")
    public GitRepositoryDto updateToken(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestBody UpdateGitTokenRequest req
    ) {
        return support.updateToken(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_MANAGE), req);
    }

    @DeleteMapping("/repository")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disconnectRepository(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId) {
        support.disconnectRepository(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_MANAGE));
    }

    @GetMapping("/branches")
    public List<GitBranchDto> listBranches(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId) {
        return support.listBranches(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_READ));
    }

    @PostMapping("/branches")
    @ResponseStatus(HttpStatus.CREATED)
    public GitBranchDto createBranch(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestBody CreateGitBranchRequest req
    ) {
        return support.createBranch(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_WRITE), req);
    }

    @DeleteMapping("/branches")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBranch(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestParam String name
    ) {
        support.deleteBranch(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_DELETE), name);
    }

    @GetMapping("/tree")
    public List<GitTreeEntryDto> listDirectory(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestParam(required = false) String branch, @RequestParam(required = false, defaultValue = "") String path
    ) {
        return support.listDirectory(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_READ), branch, path);
    }

    @GetMapping("/file")
    public GitFileContentDto getFileContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestParam(required = false) String branch, @RequestParam String path
    ) {
        return support.getFileContent(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_READ), branch, path);
    }

    @PutMapping("/file")
    public GitMutationResultDto upsertFile(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestBody UpsertGitFileRequest req
    ) {
        return support.upsertFile(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_WRITE), req);
    }

    @DeleteMapping("/file")
    public GitMutationResultDto deleteFile(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestBody DeleteGitFileRequest req
    ) {
        return support.deleteFile(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_DELETE), req);
    }

    @GetMapping("/commits")
    public List<GitCommitDto> listCommits(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestParam(required = false) String branch, @RequestParam(defaultValue = "30") int limit
    ) {
        return support.listCommits(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_READ), branch, limit);
    }

    @PostMapping("/commits/sync")
    public List<GitCommitDto> syncCommits(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestParam(required = false) String branch, @RequestParam(defaultValue = "30") int limit
    ) {
        return support.syncCommits(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_READ), branch, limit);
    }

    @GetMapping("/commits/{sha}")
    public GitCommitDetailDto getCommitDetail(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable String sha
    ) {
        return support.getCommitDetail(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_READ), sha);
    }

    @GetMapping("/pulls")
    public List<GitPullRequestDto> listPullRequests(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestParam(defaultValue = "all") String state
    ) {
        return support.listPullRequests(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_READ), state);
    }

    @PostMapping("/pulls")
    @ResponseStatus(HttpStatus.CREATED)
    public GitPullRequestDto createPullRequest(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestBody CreateGitPullRequest req
    ) {
        return support.createPullRequest(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_WRITE), req);
    }

    @PostMapping("/pulls/{pullNumber}/merge")
    public GitPullRequestDto mergePullRequest(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable int pullNumber, @RequestBody(required = false) MergeGitPullRequest req
    ) {
        return support.mergePullRequest(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.GIT_WRITE), pullNumber, req);
    }
}
