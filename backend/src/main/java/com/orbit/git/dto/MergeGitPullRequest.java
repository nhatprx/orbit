package com.orbit.git.dto;

public record MergeGitPullRequest(
    String commitTitle,
    String mergeMethod
) {}
