package com.orbit.issues.repository;

import java.util.UUID;

/** SQL GROUP BY projection for per-project issue status and priority counts. */
public record ProjectIssueAggregate(
    UUID projectId,
    Long totalIssues,
    Long backlogCount,
    Long todoCount,
    Long inProgressCount,
    Long inReviewCount,
    Long doneCount,
    Long criticalCount
) {

    public static final ProjectIssueAggregate EMPTY = new ProjectIssueAggregate(null, 0L, 0L, 0L, 0L, 0L, 0L, 0L);

    public int totalInt() { return toInt(totalIssues); }
    public int backlogInt() { return toInt(backlogCount); }
    public int todoInt() { return toInt(todoCount); }
    public int inProgressInt() { return toInt(inProgressCount); }
    public int inReviewInt() { return toInt(inReviewCount); }
    public int doneInt() { return toInt(doneCount); }
    public int criticalInt() { return toInt(criticalCount); }

    private static int toInt(Long value) {
        return value == null ? 0 : value.intValue();
    }
}
