package com.orbit.issues.dto;

import java.util.UUID;

public record ProjectIssueSummaryDto(
    UUID projectId,
    String projectName,
    String projectSlug,
    int totalIssues,
    int backlogCount,
    int todoCount,
    int inProgressCount,
    int inReviewCount,
    int doneCount,
    int criticalCount,
    String activeSprintName,
    int completionPercent
) {}
