package com.orbit.issues.dto;

import java.time.Instant;
import java.util.UUID;

public record IssueCommentDto(
    UUID id,
    UUID issueId,
    UUID authorId,
    String authorName,
    String body,
    Instant createdAt,
    Instant updatedAt
) {}
