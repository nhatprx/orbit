package com.orbit.git.service;

import com.orbit.common.ApiException;
import com.orbit.git.client.GitHubClient;
import com.orbit.git.dto.CreateGitPullRequest;
import com.orbit.git.dto.GitCommitDetailDto;
import com.orbit.git.dto.GitCommitDto;
import com.orbit.git.dto.GitPullRequestDto;
import com.orbit.git.dto.MergeGitPullRequest;
import com.orbit.git.entity.GitCommitCacheEntity;
import com.orbit.git.entity.GitRepositoryEntity;
import com.orbit.git.repository.GitCommitCacheRepository;
import com.orbit.git.repository.GitRepositoryJpaRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Handles GitHub commit history caching/sync, commit diff inspection, and pull requests. */
@Service
public class GitHistoryService {

    private static final int DEFAULT_COMMIT_LIMIT = 30;
    private static final int MAX_COMMIT_LIMIT = 100;

    private final GitRepositoryService repoService;
    private final GitHubClient gitHub;
    private final GitCommitCacheRepository commitCache;
    private final GitRepositoryJpaRepository repoJpa;

    public GitHistoryService(
        GitRepositoryService repoService,
        GitHubClient gitHub,
        GitCommitCacheRepository commitCache,
        GitRepositoryJpaRepository repoJpa
    ) {
        this.repoService = repoService;
        this.gitHub = gitHub;
        this.commitCache = commitCache;
        this.repoJpa = repoJpa;
    }

    @Transactional
    public List<GitCommitDto> listCommits(GitScope scope, String branch, int limit) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String resolvedBranch = resolveBranch(entity, branch);
        int clamped = clampLimit(limit);
        List<GitCommitCacheEntity> cached =
            commitCache.findByRepositoryIdAndBranchOrderByCommittedAtDesc(entity.getId(), resolvedBranch);
        if (cached.isEmpty()) {
            return syncCommitsInternal(entity, resolvedBranch, clamped);
        }
        return cached.stream().limit(clamped).map(GitHistoryService::toCommitDto).toList();
    }

    @Transactional
    public List<GitCommitDto> syncCommits(GitScope scope, String branch, int limit) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String resolvedBranch = resolveBranch(entity, branch);
        return syncCommitsInternal(entity, resolvedBranch, clampLimit(limit));
    }

    public GitCommitDetailDto getCommitDetail(GitScope scope, String sha) {
        String cleanSha = requireNonBlank(sha, "sha");
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String token = repoService.decryptToken(entity);
        return gitHub.getCommitDetail(token, entity.getRepoOwner(), entity.getRepoName(), cleanSha);
    }

    public List<GitPullRequestDto> listPullRequests(GitScope scope, String state) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String token = repoService.decryptToken(entity);
        String safeState = (state == null || state.isBlank()) ? "all" : state.trim().toLowerCase();
        return gitHub.listPullRequests(token, entity.getRepoOwner(), entity.getRepoName(), safeState);
    }

    public GitPullRequestDto createPullRequest(GitScope scope, CreateGitPullRequest req) {
        if (req == null) {
            throw ApiException.badRequest("INVALID_GIT_INPUT", "Request body is required.");
        }
        String title = requireNonBlank(req.title(), "title");
        String source = requireNonBlank(req.sourceBranch(), "sourceBranch");
        String target = requireNonBlank(req.targetBranch(), "targetBranch");
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String token = repoService.decryptToken(entity);
        CreateGitPullRequest normalized = new CreateGitPullRequest(title, req.description(), source, target);
        return gitHub.createPullRequest(token, entity.getRepoOwner(), entity.getRepoName(), normalized);
    }

    public GitPullRequestDto mergePullRequest(GitScope scope, int pullNumber, MergeGitPullRequest req) {
        if (pullNumber <= 0) {
            throw ApiException.badRequest("INVALID_GIT_INPUT", "pullNumber must be positive.");
        }
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String token = repoService.decryptToken(entity);
        return gitHub.mergePullRequest(token, entity.getRepoOwner(), entity.getRepoName(), pullNumber, req);
    }

    private List<GitCommitDto> syncCommitsInternal(GitRepositoryEntity entity, String branch, int limit) {
        String token = repoService.decryptToken(entity);
        List<GitCommitDto> remote = gitHub.listCommits(token, entity.getRepoOwner(), entity.getRepoName(), branch, limit);
        commitCache.deleteByRepositoryIdAndBranch(entity.getId(), branch);
        commitCache.flush();
        Instant now = Instant.now();
        List<GitCommitCacheEntity> toSave = new ArrayList<>(remote.size());
        for (GitCommitDto dto : remote) {
            GitCommitCacheEntity row = new GitCommitCacheEntity();
            row.setId(UUID.randomUUID());
            row.setRepositoryId(entity.getId());
            row.setBranch(branch);
            row.setSha(dto.sha());
            row.setMessage(truncate(dto.message(), 1000));
            row.setAuthorName(truncate(dto.authorName(), 255));
            row.setAuthorEmail(truncate(dto.authorEmail(), 255));
            row.setCommittedAt(dto.committedAt() != null ? dto.committedAt() : now);
            row.setFilesChanged(dto.filesChanged());
            row.setAdditions(dto.additions());
            row.setDeletions(dto.deletions());
            row.setHtmlUrl(dto.htmlUrl());
            row.setSyncedAt(now);
            toSave.add(row);
        }
        commitCache.saveAll(toSave);
        entity.setLastSyncedAt(now);
        entity.setUpdatedAt(now);
        repoJpa.save(entity);
        return remote;
    }

    private static GitCommitDto toCommitDto(GitCommitCacheEntity e) {
        return new GitCommitDto(
            e.getSha(), e.getMessage(), e.getAuthorName(), e.getAuthorEmail(),
            e.getCommittedAt(), e.getFilesChanged(), e.getAdditions(), e.getDeletions(), e.getHtmlUrl()
        );
    }

    private static String resolveBranch(GitRepositoryEntity entity, String branch) {
        return (branch == null || branch.isBlank()) ? entity.getDefaultBranch() : branch.trim();
    }

    private static int clampLimit(int limit) {
        if (limit <= 0) {
            return DEFAULT_COMMIT_LIMIT;
        }
        return Math.min(limit, MAX_COMMIT_LIMIT);
    }

    private static String truncate(String s, int max) {
        if (s == null || s.length() <= max) {
            return s;
        }
        return s.substring(0, max);
    }

    private static String requireNonBlank(String value, String field) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest("INVALID_GIT_INPUT", field + " is required.");
        }
        return value.trim();
    }
}
