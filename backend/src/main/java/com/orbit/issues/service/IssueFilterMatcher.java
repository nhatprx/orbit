package com.orbit.issues.service;

import com.orbit.common.InputRules;
import com.orbit.issues.entity.IssuePriority;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.IssueType;
import com.orbit.issues.entity.ProjectIssueEntity;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Applies optional query filters to a project's issue list. */
public final class IssueFilterMatcher {

    private IssueFilterMatcher() {}

    public static List<ProjectIssueEntity> filter(
        List<ProjectIssueEntity> items,
        String type,
        String status,
        String priority,
        UUID sprintId,
        Boolean backlogOnly,
        UUID parentId,
        UUID assigneeId,
        String q
    ) {
        IssueType parsedType = parseOptionalFilter(type, raw -> IssueValidationHelper.parseType(raw, null));
        IssueStatus parsedStatus = parseOptionalFilter(status, raw -> IssueValidationHelper.parseStatus(raw, null));
        IssuePriority parsedPriority = parseOptionalFilter(priority, raw -> IssueValidationHelper.parsePriority(raw, null));
        String query = InputRules.blankToNull(q);
        String loweredQuery = query == null ? null : query.toLowerCase(Locale.ROOT);
        boolean onlyBacklog = Boolean.TRUE.equals(backlogOnly);

        return items.stream()
            .filter(i -> parsedType == null || i.getType() == parsedType)
            .filter(i -> parsedStatus == null || i.getStatus() == parsedStatus)
            .filter(i -> parsedPriority == null || i.getPriority() == parsedPriority)
            .filter(i -> !onlyBacklog || i.getSprintId() == null)
            .filter(i -> onlyBacklog || sprintId == null || sprintId.equals(i.getSprintId()))
            .filter(i -> parentId == null || parentId.equals(i.getParentId()))
            .filter(i -> assigneeId == null || assigneeId.equals(i.getAssigneeId()))
            .filter(i -> loweredQuery == null || matchesText(i, loweredQuery))
            .toList();
    }

    private static <T> T parseOptionalFilter(String raw, java.util.function.Function<String, T> parser) {
        String trimmed = InputRules.blankToNull(raw);
        if (trimmed == null || "ALL".equalsIgnoreCase(trimmed)) {
            return null;
        }
        return parser.apply(trimmed);
    }

    private static boolean matchesText(ProjectIssueEntity issue, String loweredQuery) {
        return containsIgnoreCase(issue.getIssueKey(), loweredQuery)
            || containsIgnoreCase(issue.getTitle(), loweredQuery)
            || containsIgnoreCase(issue.getDescription(), loweredQuery)
            || containsIgnoreCase(issue.getLabels(), loweredQuery);
    }

    private static boolean containsIgnoreCase(String field, String loweredQuery) {
        return field != null && field.toLowerCase(Locale.ROOT).contains(loweredQuery);
    }
}
