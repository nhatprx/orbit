package com.orbit.git.service;

import com.orbit.common.ApiException;
import com.orbit.git.client.GitHubCollaborationClient;
import com.orbit.git.dto.GitCollaborationDtos.*;
import com.orbit.git.entity.GitRepositoryEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Coordinates PR detail/reviews, CI/CD jobs/re-runs, branch compare, and AI analysis for Git scopes. */
@Service
public class GitCollaborationService {

    private final GitRepositoryService repoService;
    private final GitHubCollaborationClient client;
    private final GitAiAnalysisService aiAnalysis;

    public GitCollaborationService(
        GitRepositoryService repoService,
        GitHubCollaborationClient client,
        GitAiAnalysisService aiAnalysis
    ) {
        this.repoService = repoService;
        this.client = client;
        this.aiAnalysis = aiAnalysis;
    }

    public GitPrDetailDto getPullRequestDetail(GitScope scope, int pullNumber) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        return client.getPullRequestDetail(repoService.decryptToken(entity), entity.getRepoOwner(), entity.getRepoName(), pullNumber);
    }

    public void submitPullRequestReview(GitScope scope, int pullNumber, GitPrReviewRequest req) {
        if (req == null) throw ApiException.badRequest("VALIDATION_ERROR", "Review payload is required.");
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        client.submitPullRequestReview(
            repoService.decryptToken(entity), entity.getRepoOwner(), entity.getRepoName(),
            pullNumber, req.event(), req.body()
        );
    }

    public GitAiAnalysisDto aiReviewPullRequest(UUID userId, GitScope scope, int pullNumber) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        GitPrDetailDto detail = client.getPullRequestDetail(
            repoService.decryptToken(entity), entity.getRepoOwner(), entity.getRepoName(), pullNumber
        );
        return aiAnalysis.reviewPullRequest(userId, entity.getRepoOwner() + "/" + entity.getRepoName(), detail);
    }

    public List<GitWorkflowJobDto> listWorkflowJobs(GitScope scope, long runId) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        return client.listWorkflowJobs(repoService.decryptToken(entity), entity.getRepoOwner(), entity.getRepoName(), runId);
    }

    public void rerunWorkflow(GitScope scope, long runId, boolean failedOnly) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        client.rerunWorkflow(repoService.decryptToken(entity), entity.getRepoOwner(), entity.getRepoName(), runId, failedOnly);
    }

    public GitAiAnalysisDto aiExplainWorkflowFailure(UUID userId, GitScope scope, long runId) {
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        List<GitWorkflowJobDto> jobs = client.listWorkflowJobs(
            repoService.decryptToken(entity), entity.getRepoOwner(), entity.getRepoName(), runId
        );
        return aiAnalysis.explainWorkflowFailure(userId, entity.getRepoOwner() + "/" + entity.getRepoName(), runId, jobs);
    }

    public GitBranchCompareDto compareBranches(GitScope scope, String baseBranch, String headBranch) {
        if (baseBranch == null || baseBranch.isBlank() || headBranch == null || headBranch.isBlank()) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Both base and head branch names are required.");
        }
        GitRepositoryEntity entity = repoService.requireEntity(scope);
        return client.compareBranches(
            repoService.decryptToken(entity), entity.getRepoOwner(), entity.getRepoName(),
            baseBranch.trim(), headBranch.trim()
        );
    }
}
