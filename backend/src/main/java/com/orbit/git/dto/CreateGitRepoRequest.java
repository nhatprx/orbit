package com.orbit.git.dto;

public record CreateGitRepoRequest(
    String accessToken,
    String repoName,
    String description,
    boolean privateRepo
) {}
