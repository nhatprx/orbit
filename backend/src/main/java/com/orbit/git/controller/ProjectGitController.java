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

/** Project-scoped GitHub Git REST API endpoints. */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/git")
public class ProjectGitController {

    private final GitAccessGuard guard;
    private final GitControllerSupport support;

    public ProjectGitController(GitAccessGuard guard, GitControllerSupport support) {
        this.guard = guard;
        this.support = support;
    }

    @PostMapping("/inspect-token")
    public InspectGitTokenResponse inspectToken(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @RequestBody InspectGitTokenRequest req
    ) {
        return support.inspectToken(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_MANAGE), req);
    }

    @GetMapping("/repository")
    public GitRepositoryDto getRepository(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId
    ) {
        return support.getRepository(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_READ));
    }

    @PostMapping("/repository/connect")
    @ResponseStatus(HttpStatus.CREATED)
    public GitRepositoryDto connectRepository(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @RequestBody ConnectGitRepoRequest req
    ) {
        return support.connectRepository(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_MANAGE), p.userId(), req);
    }

    @PostMapping("/repository/create")
    @ResponseStatus(HttpStatus.CREATED)
    public GitRepositoryDto createRepository(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @RequestBody CreateGitRepoRequest req
    ) {
        return support.createRepository(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_MANAGE), p.userId(), req);
    }

    @PatchMapping("/repository/token")
    public GitRepositoryDto updateToken(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @RequestBody UpdateGitTokenRequest req
    ) {
        return support.updateToken(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_MANAGE), req);
    }

    @DeleteMapping("/repository")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disconnectRepository(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId
    ) {
        support.disconnectRepository(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_MANAGE));
    }

    @GetMapping("/branches")
    public List<GitBranchDto> listBranches(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId
    ) {
        return support.listBranches(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_READ));
    }

    @PostMapping("/branches")
    @ResponseStatus(HttpStatus.CREATED)
    public GitBranchDto createBranch(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @RequestBody CreateGitBranchRequest req
    ) {
        return support.createBranch(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_WRITE), req);
    }

    @DeleteMapping("/branches")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBranch(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @RequestParam String name
    ) {
        support.deleteBranch(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_DELETE), name);
    }

    @GetMapping("/tree")
    public List<GitTreeEntryDto> listDirectory(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId,
        @RequestParam(required = false) String branch, @RequestParam(required = false, defaultValue = "") String path
    ) {
        return support.listDirectory(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_READ), branch, path);
    }

    @GetMapping("/file")
    public GitFileContentDto getFileContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId,
        @RequestParam(required = false) String branch, @RequestParam String path
    ) {
        return support.getFileContent(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_READ), branch, path);
    }

    @PutMapping("/file")
    public GitMutationResultDto upsertFile(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @RequestBody UpsertGitFileRequest req
    ) {
        return support.upsertFile(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_WRITE), req);
    }

    @DeleteMapping("/file")
    public GitMutationResultDto deleteFile(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @RequestBody DeleteGitFileRequest req
    ) {
        return support.deleteFile(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_DELETE), req);
    }

    @GetMapping("/commits")
    public List<GitCommitDto> listCommits(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId,
        @RequestParam(required = false) String branch, @RequestParam(defaultValue = "30") int limit
    ) {
        return support.listCommits(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_READ), branch, limit);
    }

    @PostMapping("/commits/sync")
    public List<GitCommitDto> syncCommits(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId,
        @RequestParam(required = false) String branch, @RequestParam(defaultValue = "30") int limit
    ) {
        return support.syncCommits(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_READ), branch, limit);
    }

    @GetMapping("/commits/{sha}")
    public GitCommitDetailDto getCommitDetail(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @PathVariable String sha
    ) {
        return support.getCommitDetail(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_READ), sha);
    }

    @GetMapping("/pulls")
    public List<GitPullRequestDto> listPullRequests(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @RequestParam(defaultValue = "all") String state
    ) {
        return support.listPullRequests(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_READ), state);
    }

    @PostMapping("/pulls")
    @ResponseStatus(HttpStatus.CREATED)
    public GitPullRequestDto createPullRequest(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @RequestBody CreateGitPullRequest req
    ) {
        return support.createPullRequest(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_WRITE), req);
    }

    @PostMapping("/pulls/{pullNumber}/merge")
    public GitPullRequestDto mergePullRequest(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID projectId, @PathVariable int pullNumber, @RequestBody(required = false) MergeGitPullRequest req
    ) {
        return support.mergePullRequest(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PGIT_WRITE), pullNumber, req);
    }
}
