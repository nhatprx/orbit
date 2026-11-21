package com.orbit.git.dto;

public record GitCommitFileDiffDto(
    String filename,
    String status,
    int additions,
    int deletions,
    int changes,
    String patch
) {}
