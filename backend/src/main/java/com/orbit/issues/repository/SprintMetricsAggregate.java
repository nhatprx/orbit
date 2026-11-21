package com.orbit.issues.repository;

import java.util.UUID;

/** SQL GROUP BY projection for sprint issue counts and story points. */
public record SprintMetricsAggregate(
    UUID sprintId,
    Long totalIssues,
    Long completedIssues,
    Long totalStoryPoints,
    Long completedStoryPoints
) {

    public static final SprintMetricsAggregate EMPTY = new SprintMetricsAggregate(null, 0L, 0L, 0L, 0L);

    public int totalIssuesInt() { return totalIssues == null ? 0 : totalIssues.intValue(); }
    public int completedIssuesInt() { return completedIssues == null ? 0 : completedIssues.intValue(); }
    public int totalStoryPointsInt() { return totalStoryPoints == null ? 0 : totalStoryPoints.intValue(); }
    public int completedStoryPointsInt() { return completedStoryPoints == null ? 0 : completedStoryPoints.intValue(); }
}
