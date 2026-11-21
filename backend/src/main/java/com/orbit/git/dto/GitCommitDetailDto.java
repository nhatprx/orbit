package com.orbit.git.dto;

import java.time.Instant;
import java.util.List;

public record GitCommitDetailDto(
    String sha,
    String message,
    String authorName,
    String authorEmail,
    Instant committedAt,
    int additions,
    int deletions,
    List<GitCommitFileDiffDto> files,
    String htmlUrl
) {}
