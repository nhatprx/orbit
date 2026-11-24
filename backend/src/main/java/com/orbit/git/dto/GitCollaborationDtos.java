package com.orbit.git.dto;

import java.time.Instant;
import java.util.List;

/** DTOs for PR detail/review, Actions jobs/steps, branch comparison, and Git AI analysis. */
public final class GitCollaborationDtos {

    private GitCollaborationDtos() {}

    public record GitPrCommentDto(
        long id,
        String author,
        String avatarUrl,
        String body,
        Instant createdAt
    ) {}

    public record GitPrDetailDto(
        GitPullRequestDto pullRequest,
        List<GitCommitFileDiffDto> files,
        List<GitPrCommentDto> comments,
        int additions,
        int deletions
    ) {}

    public record GitPrReviewRequest(
        String event,
        String body
    ) {}

    public record GitWorkflowStepDto(
        int number,
        String name,
        String status,
        String conclusion
    ) {}

    public record GitWorkflowJobDto(
        long id,
        String name,
        String status,
        String conclusion,
        Instant startedAt,
        Instant completedAt,
        List<GitWorkflowStepDto> steps
    ) {}

    public record GitBranchCompareDto(
        String baseBranch,
        String headBranch,
        String status,
        int aheadBy,
        int behindBy,
        int totalCommits,
        List<GitCommitDto> commits,
        List<GitCommitFileDiffDto> files
    ) {}

    public record GitAiAnalysisDto(
        String summary,
        String modelUsed
    ) {}
}
