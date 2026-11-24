package com.orbit.git.dto;

import java.time.Instant;

/** Summary of a GitHub Actions workflow run for CI/CD visibility in Orbit Git. */
public record GitWorkflowRunDto(
    long id,
    String name,
    String headBranch,
    String headSha,
    String status,
    String conclusion,
    String event,
    String actorLogin,
    String htmlUrl,
    Instant createdAt,
    Instant updatedAt
) {}
