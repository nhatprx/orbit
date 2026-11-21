package com.orbit.git.dto;

public record UpsertGitFileRequest(
    String branch,
    String path,
    String content,
    String commitMessage,
    String sha
) {}
