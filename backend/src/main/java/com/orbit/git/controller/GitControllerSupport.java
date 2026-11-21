package com.orbit.git.controller;

import com.orbit.git.dto.ConnectGitRepoRequest;
import com.orbit.git.dto.CreateGitBranchRequest;
import com.orbit.git.dto.CreateGitPullRequest;
import com.orbit.git.dto.CreateGitRepoRequest;
import com.orbit.git.dto.DeleteGitFileRequest;
import com.orbit.git.dto.GitBranchDto;
import com.orbit.git.dto.GitCommitDetailDto;
import com.orbit.git.dto.GitCommitDto;
import com.orbit.git.dto.GitFileContentDto;
import com.orbit.git.dto.GitMutationResultDto;
import com.orbit.git.dto.GitPullRequestDto;
import com.orbit.git.dto.GitRepositoryDto;
import com.orbit.git.dto.GitTreeEntryDto;
import com.orbit.git.dto.InspectGitTokenRequest;
import com.orbit.git.dto.InspectGitTokenResponse;
import com.orbit.git.dto.MergeGitPullRequest;
import com.orbit.git.dto.UpdateGitTokenRequest;
import com.orbit.git.dto.UpsertGitFileRequest;
import com.orbit.git.service.GitContentService;
import com.orbit.git.service.GitHistoryService;
import com.orbit.git.service.GitRepositoryService;
import com.orbit.git.service.GitScope;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Shared facade keeping workspace and project Git REST controllers thin and uniform. */
@Component
public class GitControllerSupport {

    private final GitRepositoryService repoService;
    private final GitContentService contentService;
    private final GitHistoryService historyService;

    public GitControllerSupport(
        GitRepositoryService repoService,
        GitContentService contentService,
        GitHistoryService historyService
    ) {
        this.repoService = repoService;
        this.contentService = contentService;
        this.historyService = historyService;
    }

    public InspectGitTokenResponse inspectToken(GitScope scope, InspectGitTokenRequest req) {
        return repoService.inspectToken(scope, req);
    }

    public GitRepositoryDto getRepository(GitScope scope) {
        return repoService.getRepository(scope);
    }

    public GitRepositoryDto connectRepository(GitScope scope, UUID userId, ConnectGitRepoRequest req) {
        return repoService.connectRepository(scope, userId, req);
    }

    public GitRepositoryDto createRepository(GitScope scope, UUID userId, CreateGitRepoRequest req) {
        return repoService.createAndConnectRepository(scope, userId, req);
    }

    public GitRepositoryDto updateToken(GitScope scope, UpdateGitTokenRequest req) {
        return repoService.updateToken(scope, req);
    }

    public void disconnectRepository(GitScope scope) {
        repoService.disconnectRepository(scope);
    }

    public List<GitBranchDto> listBranches(GitScope scope) {
        return contentService.listBranches(scope);
    }

    public GitBranchDto createBranch(GitScope scope, CreateGitBranchRequest req) {
        return contentService.createBranch(scope, req);
    }

    public void deleteBranch(GitScope scope, String branchName) {
        contentService.deleteBranch(scope, branchName);
    }

    public List<GitTreeEntryDto> listDirectory(GitScope scope, String branch, String path) {
        return contentService.listDirectory(scope, branch, path);
    }

    public GitFileContentDto getFileContent(GitScope scope, String branch, String path) {
        return contentService.getFileContent(scope, branch, path);
    }

    public GitMutationResultDto upsertFile(GitScope scope, UpsertGitFileRequest req) {
        return contentService.upsertFile(scope, req);
    }

    public GitMutationResultDto deleteFile(GitScope scope, DeleteGitFileRequest req) {
        return contentService.deleteFile(scope, req);
    }

    public List<GitCommitDto> listCommits(GitScope scope, String branch, int limit) {
        return historyService.listCommits(scope, branch, limit);
    }

    public List<GitCommitDto> syncCommits(GitScope scope, String branch, int limit) {
        return historyService.syncCommits(scope, branch, limit);
    }

    public GitCommitDetailDto getCommitDetail(GitScope scope, String sha) {
        return historyService.getCommitDetail(scope, sha);
    }

    public List<GitPullRequestDto> listPullRequests(GitScope scope, String state) {
        return historyService.listPullRequests(scope, state);
    }

    public GitPullRequestDto createPullRequest(GitScope scope, CreateGitPullRequest req) {
        return historyService.createPullRequest(scope, req);
    }

    public GitPullRequestDto mergePullRequest(GitScope scope, int pullNumber, MergeGitPullRequest req) {
        return historyService.mergePullRequest(scope, pullNumber, req);
    }
}
