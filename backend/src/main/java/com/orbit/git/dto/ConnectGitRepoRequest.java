package com.orbit.git.dto;

public record ConnectGitRepoRequest(
    String accessToken,
    String repoOwner,
    String repoName,
    String defaultBranch
) {}
