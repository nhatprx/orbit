package com.orbit.issues.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record SprintDto(
    UUID id,
    UUID workspaceId,
    UUID projectId,
    String name,
    String goal,
    String status,
    LocalDate startDate,
    LocalDate endDate,
    int totalIssues,
    int completedIssues,
    int totalStoryPoints,
    int completedStoryPoints,
    Instant createdAt,
    Instant updatedAt
) {}
