package com.orbit.issues.dto;

import java.util.List;
import java.util.UUID;

public record WorkspaceIssuePortfolioDto(
    UUID workspaceId,
    int totalIssues,
    int openIssues,
    int inProgressIssues,
    int doneIssues,
    int criticalIssues,
    int activeSprintsCount,
    List<ProjectIssueSummaryDto> projects,
    List<IssueDto> recentIssues
) {}
