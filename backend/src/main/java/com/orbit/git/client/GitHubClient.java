package com.orbit.git.client;

import com.orbit.git.dto.CreateGitPullRequest;
import com.orbit.git.dto.CreateGitRepoRequest;
import com.orbit.git.dto.DeleteGitFileRequest;
import com.orbit.git.dto.GitBranchDto;
import com.orbit.git.dto.GitCommitDetailDto;
import com.orbit.git.dto.GitCommitDto;
import com.orbit.git.dto.GitFileContentDto;
import com.orbit.git.dto.GitHubRemoteRepoDto;
import com.orbit.git.dto.GitMutationResultDto;
import com.orbit.git.dto.GitPullRequestDto;
import com.orbit.git.dto.GitTreeEntryDto;
import com.orbit.git.dto.InspectGitTokenResponse;
import com.orbit.git.dto.MergeGitPullRequest;
import com.orbit.git.dto.UpsertGitFileRequest;
import java.util.List;

/** Gateway interface for GitHub REST API operations used by Orbit Git services. */
public interface GitHubClient {

    InspectGitTokenResponse inspectToken(String token);

    GitHubRemoteRepoDto getRepository(String token, String owner, String repo);

    GitHubRemoteRepoDto createRepository(String token, String name, String description, boolean privateRepo);

    default GitHubRemoteRepoDto createRepository(String token, CreateGitRepoRequest req) {
        return createRepository(token, req.repoName().trim(), req.description(), req.privateRepo());
    }

    List<GitBranchDto> listBranches(String token, String owner, String repo, String defaultBranch);

    GitBranchDto createBranch(
        String token, String owner, String repo, String branchName, String sourceBranch, String defaultBranch
    );

    void deleteBranch(String token, String owner, String repo, String branchName);

    List<GitTreeEntryDto> listDirectory(String token, String owner, String repo, String branch, String path);

    GitFileContentDto getFileContent(String token, String owner, String repo, String branch, String path);

    GitMutationResultDto upsertFile(String token, String owner, String repo, UpsertGitFileRequest req);

    GitMutationResultDto deleteFile(String token, String owner, String repo, DeleteGitFileRequest req);

    List<GitCommitDto> listCommits(String token, String owner, String repo, String branch, int limit);

    GitCommitDetailDto getCommitDetail(String token, String owner, String repo, String sha);

    List<GitPullRequestDto> listPullRequests(String token, String owner, String repo, String state);

    GitPullRequestDto createPullRequest(String token, String owner, String repo, CreateGitPullRequest req);

    GitPullRequestDto mergePullRequest(
        String token, String owner, String repo, int pullNumber, MergeGitPullRequest req
    );
}
