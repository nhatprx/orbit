package com.orbit.git.dto;

public record DeleteGitFileRequest(
    String branch,
    String path,
    String sha,
    String commitMessage
) {}
