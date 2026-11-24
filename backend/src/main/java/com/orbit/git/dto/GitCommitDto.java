package com.orbit.git.dto;

import java.time.Instant;
import java.util.List;

public record GitCommitDto(
    String sha,
    String message,
    String authorName,
    String authorEmail,
    Instant committedAt,
    int filesChanged,
    int additions,
    int deletions,
    String htmlUrl,
    List<String> parentShas
) {
    public GitCommitDto(
        String sha, String message, String authorName, String authorEmail,
        Instant committedAt, int filesChanged, int additions, int deletions, String htmlUrl
    ) {
        this(sha, message, authorName, authorEmail, committedAt, filesChanged, additions, deletions, htmlUrl, List.of());
    }
}
