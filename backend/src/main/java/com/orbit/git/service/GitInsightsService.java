package com.orbit.git.service;

import com.orbit.git.client.GitHubInsightsClient;
import com.orbit.git.dto.GitCollaboratorDto;
import com.orbit.git.dto.GitRepoStatsDto;
import com.orbit.git.dto.GitWorkflowRunDto;
import com.orbit.git.entity.GitRepositoryEntity;
import java.util.List;
import org.springframework.stereotype.Service;

/** Reads CI/CD workflow runs and collaborator lists for connected GitHub repositories. */
@Service
public class GitInsightsService {

    private final GitRepositoryService repoService;
    private final GitHubInsightsClient insightsClient;

    public GitInsightsService(GitRepositoryService repoService, GitHubInsightsClient insightsClient) {
        this.repoService = repoService;
        this.insightsClient = insightsClient;
    }

    public List<GitWorkflowRunDto> listWorkflowRuns(GitScope scope, int limit) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String token = repoService.decryptToken(entity);
        return insightsClient.listWorkflowRuns(token, entity.getRepoOwner(), entity.getRepoName(), limit);
    }

    public List<GitCollaboratorDto> listCollaborators(GitScope scope) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String token = repoService.decryptToken(entity);
        return insightsClient.listCollaborators(token, entity.getRepoOwner(), entity.getRepoName());
    }

    public GitRepoStatsDto getRepoStats(GitScope scope) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        String token = repoService.decryptToken(entity);
        return insightsClient.getRepoStats(token, entity.getRepoOwner(), entity.getRepoName());
    }
}
