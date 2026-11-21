package com.orbit.git.dto;

public record GitFileContentDto(
    String path,
    String name,
    String sha,
    long size,
    String branch,
    String language,
    String content,
    String htmlUrl
) {}
