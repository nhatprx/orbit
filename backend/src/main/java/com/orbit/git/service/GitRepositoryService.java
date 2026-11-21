package com.orbit.git.service;

import com.orbit.common.ApiException;
import com.orbit.git.client.GitHubClient;
import com.orbit.git.dto.ConnectGitRepoRequest;
import com.orbit.git.dto.CreateGitRepoRequest;
import com.orbit.git.dto.GitHubRemoteRepoDto;
import com.orbit.git.dto.GitRepositoryDto;
import com.orbit.git.dto.InspectGitTokenRequest;
import com.orbit.git.dto.InspectGitTokenResponse;
import com.orbit.git.dto.UpdateGitTokenRequest;
import com.orbit.git.entity.GitRepositoryEntity;
import com.orbit.git.repository.GitCommitCacheRepository;
import com.orbit.git.repository.GitRepositoryJpaRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manages GitHub token inspection, repository connection, creation, rotation, and disconnection. */
@Service
public class GitRepositoryService {

    private final GitRepositoryJpaRepository repoJpa;
    private final GitCommitCacheRepository commitCache;
    private final GitHubClient gitHub;
    private final GitTokenCrypto tokenCrypto;

    public GitRepositoryService(
        GitRepositoryJpaRepository repoJpa,
        GitCommitCacheRepository commitCache,
        GitHubClient gitHub,
        GitTokenCrypto tokenCrypto
    ) {
        this.repoJpa = repoJpa;
        this.commitCache = commitCache;
        this.gitHub = gitHub;
        this.tokenCrypto = tokenCrypto;
    }

    public InspectGitTokenResponse inspectToken(GitScope scope, InspectGitTokenRequest req) {
        String token = requireNonBlank(req != null ? req.accessToken() : null, "accessToken");
        return gitHub.inspectToken(token);
    }

    public GitRepositoryDto getRepository(GitScope scope) {
        return toDto(requireEntity(scope));
    }

    @Transactional
    public GitRepositoryDto connectRepository(GitScope scope, UUID userId, ConnectGitRepoRequest req) {
        if (req == null) {
            throw ApiException.badRequest("INVALID_GIT_INPUT", "Request body is required.");
        }
        String token = requireNonBlank(req.accessToken(), "accessToken");
        String owner = requireNonBlank(req.repoOwner(), "repoOwner");
        String name = requireNonBlank(req.repoName(), "repoName");
        GitHubRemoteRepoDto remote = gitHub.getRepository(token, owner, name);
        String defaultBranch = (req.defaultBranch() != null && !req.defaultBranch().isBlank())
            ? req.defaultBranch().trim()
            : remote.defaultBranch();
        return toDto(saveConnection(scope, userId, remote, defaultBranch, token));
    }

    @Transactional
    public GitRepositoryDto createAndConnectRepository(GitScope scope, UUID userId, CreateGitRepoRequest req) {
        if (req == null) {
            throw ApiException.badRequest("INVALID_GIT_INPUT", "Request body is required.");
        }
        String token = requireNonBlank(req.accessToken(), "accessToken");
        String name = requireNonBlank(req.repoName(), "repoName");
        GitHubRemoteRepoDto remote = gitHub.createRepository(token, name, req.description(), req.privateRepo());
        return toDto(saveConnection(scope, userId, remote, remote.defaultBranch(), token));
    }

    @Transactional
    public GitRepositoryDto updateToken(GitScope scope, UpdateGitTokenRequest req) {
        String token = requireNonBlank(req != null ? req.accessToken() : null, "accessToken");
        GitRepositoryEntity entity = requireEntity(scope);
        gitHub.getRepository(token, entity.getRepoOwner(), entity.getRepoName());
        entity.setAccessTokenEncrypted(tokenCrypto.encrypt(token));
        entity.setTokenHint(tokenCrypto.maskToken(token));
        entity.setUpdatedAt(Instant.now());
        return toDto(repoJpa.save(entity));
    }

    @Transactional
    public void disconnectRepository(GitScope scope) {
        GitRepositoryEntity entity = requireEntity(scope);
        commitCache.deleteByRepositoryId(entity.getId());
        repoJpa.deleteByScopeTypeAndScopeId(scope.type(), scope.scopeId());
    }

    GitRepositoryEntity requireEntity(GitScope scope) {
        return repoJpa.findByScopeTypeAndScopeId(scope.type(), scope.scopeId())
            .orElseThrow(() -> ApiException.notFound("GIT_REPO_NOT_CONNECTED",
                "No GitHub repository is connected to this scope."));
    }

    String decryptToken(GitRepositoryEntity entity) {
        return tokenCrypto.decrypt(entity.getAccessTokenEncrypted());
    }

    private GitRepositoryEntity saveConnection(
        GitScope scope, UUID userId, GitHubRemoteRepoDto remote, String defaultBranch, String rawToken
    ) {
        Instant now = Instant.now();
        Optional<GitRepositoryEntity> existing =
            repoJpa.findByScopeTypeAndScopeId(scope.type(), scope.scopeId());
        GitRepositoryEntity entity;
        if (existing.isPresent()) {
            entity = existing.get();
            commitCache.deleteByRepositoryId(entity.getId());
            commitCache.flush();
            entity.setLastSyncedAt(null);
        } else {
            entity = new GitRepositoryEntity();
            entity.setId(UUID.randomUUID());
            entity.setScopeType(scope.type());
            entity.setScopeId(scope.scopeId());
            entity.setWorkspaceId(scope.workspaceId());
            entity.setProjectId(scope.projectId());
            entity.setProvider("GITHUB");
            entity.setCreatedAt(now);
        }
        entity.setRepoOwner(remote.owner());
        entity.setRepoName(remote.name());
        entity.setDefaultBranch(defaultBranch != null && !defaultBranch.isBlank() ? defaultBranch : "main");
        entity.setVisibility(remote.privateRepo() ? "PRIVATE" : "PUBLIC");
        entity.setCloneUrl(remote.cloneUrl());
        entity.setHtmlUrl(remote.htmlUrl());
        entity.setAccessTokenEncrypted(tokenCrypto.encrypt(rawToken));
        entity.setTokenHint(tokenCrypto.maskToken(rawToken));
        entity.setConnectedBy(userId);
        entity.setUpdatedAt(now);
        return repoJpa.save(entity);
    }

    private static GitRepositoryDto toDto(GitRepositoryEntity e) {
        return new GitRepositoryDto(
            e.getId(), e.getScopeType().name(), e.getScopeId(), e.getProvider(),
            e.getRepoOwner(), e.getRepoName(), e.getRepoOwner() + "/" + e.getRepoName(),
            e.getDefaultBranch(), e.getVisibility(), e.getCloneUrl(), e.getHtmlUrl(),
            e.getTokenHint(), e.getLastSyncedAt(), e.getCreatedAt()
        );
    }

    private static String requireNonBlank(String value, String field) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest("INVALID_GIT_INPUT", field + " is required.");
        }
        return value.trim();
    }
}
