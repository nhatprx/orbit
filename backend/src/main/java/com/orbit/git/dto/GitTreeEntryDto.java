package com.orbit.git.dto;

public record GitTreeEntryDto(
    String path,
    String name,
    String type,
    long size,
    String sha,
    String htmlUrl
) {}
