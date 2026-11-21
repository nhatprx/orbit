package com.orbit.git.dto;

public record CreateGitPullRequest(
    String title,
    String description,
    String sourceBranch,
    String targetBranch
) {}
