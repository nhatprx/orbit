package com.orbit.issues.dto;

import java.time.Instant;
import java.util.UUID;

public record IssueActivityDto(
    UUID id,
    UUID issueId,
    UUID actorId,
    String actorName,
    String action,
    String fieldName,
    String oldValue,
    String newValue,
    Instant createdAt
) {}
