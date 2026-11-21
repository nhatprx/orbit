package com.orbit.git.dto;

public record GitHubRemoteRepoDto(
    String owner,
    String name,
    String fullName,
    String defaultBranch,
    boolean privateRepo,
    String cloneUrl,
    String htmlUrl,
    String description
) {}
