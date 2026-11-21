package com.orbit.git.dto;

import java.time.Instant;

public record GitCommitDto(
    String sha,
    String message,
    String authorName,
    String authorEmail,
    Instant committedAt,
    int filesChanged,
    int additions,
    int deletions,
    String htmlUrl
) {}
