package com.orbit.git.dto;

import java.time.Instant;

public record GitPullRequestDto(
    int number,
    String title,
    String description,
    String author,
    String sourceBranch,
    String targetBranch,
    String status,
    Instant updatedAt,
    String htmlUrl
) {}
