package com.orbit.git.service;

import com.orbit.common.ApiException;
import com.orbit.git.client.GitHubClient;
import com.orbit.git.dto.CreateGitBranchRequest;
import com.orbit.git.dto.DeleteGitFileRequest;
import com.orbit.git.dto.GitBranchDto;
import com.orbit.git.dto.GitFileContentDto;
import com.orbit.git.dto.GitMutationResultDto;
import com.orbit.git.dto.GitTreeEntryDto;
import com.orbit.git.dto.UpsertGitFileRequest;
import com.orbit.git.entity.GitRepositoryEntity;
import com.orbit.git.repository.GitCommitCacheRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Handles GitHub branch management, directory browsing, and file CRUD operations. */
@Service
public class GitContentService {

    private final GitRepositoryService repoService;
    private final GitHubClient gitHub;
    private final GitCommitCacheRepository commitCache;

    public GitContentService(
        GitRepositoryService repoService,
        GitHubClient gitHub,
        GitCommitCacheRepository commitCache
    ) {
        this.repoService = repoService;
        this.gitHub = gitHub;
        this.commitCache = commitCache;
    }

    public List<GitBranchDto> listBranches(GitScope scope) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String token = repoService.decryptToken(entity);
        return gitHub.listBranches(token, entity.getRepoOwner(), entity.getRepoName(), entity.getDefaultBranch());
    }

    public GitBranchDto createBranch(GitScope scope, CreateGitBranchRequest req) {
        if (req == null) {
            throw ApiException.badRequest("INVALID_GIT_INPUT", "Request body is required.");
        }
        String branchName = requireBranchName(req.branchName(), "branchName");
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String sourceBranch = (req.sourceBranch() == null || req.sourceBranch().isBlank())
            ? entity.getDefaultBranch()
            : requireBranchName(req.sourceBranch(), "sourceBranch");
        String token = repoService.decryptToken(entity);
        return gitHub.createBranch(
            token, entity.getRepoOwner(), entity.getRepoName(), branchName, sourceBranch, entity.getDefaultBranch()
        );
    }

    @Transactional
    public void deleteBranch(GitScope scope, String branchName) {
        String clean = requireBranchName(branchName, "branchName");
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        if (clean.equals(entity.getDefaultBranch())) {
            throw ApiException.badRequest("CANNOT_DELETE_DEFAULT_BRANCH",
                "Cannot delete the repository default branch.");
        }
        String token = repoService.decryptToken(entity);
        gitHub.deleteBranch(token, entity.getRepoOwner(), entity.getRepoName(), clean);
        commitCache.deleteByRepositoryIdAndBranch(entity.getId(), clean);
    }

    public List<GitTreeEntryDto> listDirectory(GitScope scope, String branch, String path) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String resolvedBranch = resolveBranch(entity, branch);
        String cleanPath = sanitizePath(path, true);
        String token = repoService.decryptToken(entity);
        return gitHub.listDirectory(token, entity.getRepoOwner(), entity.getRepoName(), resolvedBranch, cleanPath);
    }

    public GitFileContentDto getFileContent(GitScope scope, String branch, String path) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String resolvedBranch = resolveBranch(entity, branch);
        String cleanPath = sanitizePath(path, false);
        String token = repoService.decryptToken(entity);
        return gitHub.getFileContent(token, entity.getRepoOwner(), entity.getRepoName(), resolvedBranch, cleanPath);
    }

    @Transactional
    public GitMutationResultDto upsertFile(GitScope scope, UpsertGitFileRequest req) {
        if (req == null) {
            throw ApiException.badRequest("INVALID_GIT_INPUT", "Request body is required.");
        }
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String resolvedBranch = resolveBranch(entity, req.branch());
        String cleanPath = sanitizePath(req.path(), false);
        String message = requireNonBlank(req.commitMessage(), "commitMessage");
        String content = req.content() != null ? req.content() : "";
        String token = repoService.decryptToken(entity);
        UpsertGitFileRequest normalized = new UpsertGitFileRequest(
            resolvedBranch, cleanPath, content, message, req.sha()
        );
        GitMutationResultDto result = gitHub.upsertFile(token, entity.getRepoOwner(), entity.getRepoName(), normalized);
        commitCache.deleteByRepositoryIdAndBranch(entity.getId(), resolvedBranch);
        return result;
    }

    @Transactional
    public GitMutationResultDto deleteFile(GitScope scope, DeleteGitFileRequest req) {
        if (req == null) {
            throw ApiException.badRequest("INVALID_GIT_INPUT", "Request body is required.");
        }
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String resolvedBranch = resolveBranch(entity, req.branch());
        String cleanPath = sanitizePath(req.path(), false);
        String sha = requireNonBlank(req.sha(), "sha");
        String message = requireNonBlank(req.commitMessage(), "commitMessage");
        String token = repoService.decryptToken(entity);
        DeleteGitFileRequest normalized = new DeleteGitFileRequest(resolvedBranch, cleanPath, sha, message);
        GitMutationResultDto result = gitHub.deleteFile(token, entity.getRepoOwner(), entity.getRepoName(), normalized);
        commitCache.deleteByRepositoryIdAndBranch(entity.getId(), resolvedBranch);
        return result;
    }

    private static String resolveBranch(GitRepositoryEntity entity, String branch) {
        if (branch == null || branch.isBlank()) {
            return entity.getDefaultBranch();
        }
        return requireBranchName(branch, "branch");
    }

    private static String requireBranchName(String value, String field) {
        String clean = requireNonBlank(value, field);
        if (clean.contains("..") || clean.contains("\\") || clean.startsWith("/") || clean.endsWith("/")) {
            throw ApiException.badRequest("INVALID_GIT_BRANCH", "Invalid branch name: " + clean);
        }
        return clean;
    }

    static String sanitizePath(String path, boolean allowEmpty) {
        if (path == null || path.isBlank()) {
            if (allowEmpty) {
                return "";
            }
            throw ApiException.badRequest("INVALID_GIT_INPUT", "path is required.");
        }
        String trimmed = path.trim();
        if (trimmed.contains("\\") || trimmed.contains("\0")) {
            throw ApiException.badRequest("INVALID_GIT_PATH", "Invalid characters in file path.");
        }
        String stripped = trimmed.replaceAll("^/+", "").replaceAll("/+$", "");
        if (stripped.isEmpty()) {
            if (allowEmpty) {
                return "";
            }
            throw ApiException.badRequest("INVALID_GIT_INPUT", "path is required.");
        }
        for (String segment : stripped.split("/")) {
            if ("..".equals(segment) || ".".equals(segment)) {
                throw ApiException.badRequest("INVALID_GIT_PATH", "Path traversal is not allowed.");
            }
        }
        return stripped;
    }

    private static String requireNonBlank(String value, String field) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest("INVALID_GIT_INPUT", field + " is required.");
        }
        return value.trim();
    }
}
