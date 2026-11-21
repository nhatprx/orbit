package com.orbit.issues.service;

import com.orbit.common.InputRules;
import com.orbit.issues.entity.IssuePriority;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.IssueType;
import com.orbit.issues.entity.ProjectIssueEntity;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.data.jpa.domain.Specification;

/** Translates validated query filters into database-level JPA Specifications for project issues. */
public final class IssueFilterMatcher {

    private IssueFilterMatcher() {}

    public static Specification<ProjectIssueEntity> toSpecification(
        UUID projectId,
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
        String likePattern = query == null ? null : "%" + escapeLike(query.toLowerCase(Locale.ROOT)) + "%";
        boolean onlyBacklog = Boolean.TRUE.equals(backlogOnly);

        return (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("projectId"), projectId));
            if (parsedType != null) predicates.add(cb.equal(root.get("type"), parsedType));
            if (parsedStatus != null) predicates.add(cb.equal(root.get("status"), parsedStatus));
            if (parsedPriority != null) predicates.add(cb.equal(root.get("priority"), parsedPriority));
            if (onlyBacklog) {
                predicates.add(cb.isNull(root.get("sprintId")));
            } else if (sprintId != null) {
                predicates.add(cb.equal(root.get("sprintId"), sprintId));
            }
            if (parentId != null) predicates.add(cb.equal(root.get("parentId"), parentId));
            if (assigneeId != null) predicates.add(cb.equal(root.get("assigneeId"), assigneeId));
            if (likePattern != null) {
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("issueKey")), likePattern, '\\'),
                    cb.like(cb.lower(root.get("title")), likePattern, '\\'),
                    cb.like(cb.lower(cb.coalesce(root.get("description"), "")), likePattern, '\\'),
                    cb.like(cb.lower(cb.coalesce(root.get("labels"), "")), likePattern, '\\')
                ));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static <T> T parseOptionalFilter(String raw, Function<String, T> parser) {
        String trimmed = InputRules.blankToNull(raw);
        if (trimmed == null || "ALL".equalsIgnoreCase(trimmed)) {
            return null;
        }
        return parser.apply(trimmed);
    }

    private static String escapeLike(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_");
    }
}
