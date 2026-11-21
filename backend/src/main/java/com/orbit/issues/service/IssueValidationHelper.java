package com.orbit.issues.service;

import com.orbit.common.ApiException;
import com.orbit.common.InputRules;
import com.orbit.issues.entity.IssueActivityEntity;
import com.orbit.issues.entity.IssuePriority;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.IssueType;
import com.orbit.issues.entity.SprintStatus;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Pure validation, enum parsing, label serialization, and activity factory utilities for issues. */
public final class IssueValidationHelper {

    public static final int MAX_TITLE_LENGTH = 255;
    public static final int MAX_LABELS_LENGTH = 500;
    public static final int MAX_COMMENT_LENGTH = 4000;
    public static final int MAX_SPRINT_NAME_LENGTH = 120;
    public static final int MAX_SPRINT_GOAL_LENGTH = 500;
    public static final int MAX_ACTIVITY_VALUE_LENGTH = 255;
    public static final int MAX_STORY_POINTS = 100;

    private IssueValidationHelper() {}

    public static String validateTitle(String raw) {
        String trimmed = InputRules.blankToNull(raw);
        if (trimmed == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Issue title is required.");
        }
        if (trimmed.length() > MAX_TITLE_LENGTH) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Issue title must be at most 255 characters.");
        }
        return trimmed;
    }

    public static Integer validateStoryPoints(Integer storyPoints) {
        if (storyPoints != null && (storyPoints < 0 || storyPoints > MAX_STORY_POINTS)) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Story points must be between 0 and 100.");
        }
        return storyPoints;
    }

    public static String validateCommentBody(String raw) {
        String trimmed = InputRules.blankToNull(raw);
        if (trimmed == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Comment body is required.");
        }
        if (trimmed.length() > MAX_COMMENT_LENGTH) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Comment body must be at most 4000 characters.");
        }
        return trimmed;
    }

    public static String validateSprintName(String raw) {
        String trimmed = InputRules.blankToNull(raw);
        if (trimmed == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Sprint name is required.");
        }
        if (trimmed.length() > MAX_SPRINT_NAME_LENGTH) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Sprint name must be at most 120 characters.");
        }
        return trimmed;
    }

    public static String validateSprintGoal(String raw) {
        String trimmed = InputRules.blankToNull(raw);
        if (trimmed != null && trimmed.length() > MAX_SPRINT_GOAL_LENGTH) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Sprint goal must be at most 500 characters.");
        }
        return trimmed;
    }

    public static void validateSprintDates(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw ApiException.badRequest("INVALID_DATE_RANGE", "Sprint end date cannot be before start date.");
        }
    }

    public static IssueType parseType(String raw, IssueType defaultValue) {
        return parseEnum(raw, IssueType.class, defaultValue, "issue type");
    }

    public static IssueStatus parseStatus(String raw, IssueStatus defaultValue) {
        return parseEnum(raw, IssueStatus.class, defaultValue, "issue status");
    }

    public static IssuePriority parsePriority(String raw, IssuePriority defaultValue) {
        return parseEnum(raw, IssuePriority.class, defaultValue, "issue priority");
    }

    public static SprintStatus parseSprintStatus(String raw) {
        SprintStatus parsed = parseEnum(raw, SprintStatus.class, null, "sprint status");
        if (parsed == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Sprint status is required.");
        }
        return parsed;
    }

    public static String serializeLabels(List<String> labels) {
        if (labels == null || labels.isEmpty()) {
            return null;
        }
        LinkedHashSet<String> cleaned = new LinkedHashSet<>();
        for (String label : labels) {
            if (label == null) continue;
            String normalized = label.replace(",", " ").trim();
            if (!normalized.isEmpty()) {
                cleaned.add(normalized);
            }
        }
        if (cleaned.isEmpty()) {
            return null;
        }
        String joined = String.join(",", cleaned);
        if (joined.length() > MAX_LABELS_LENGTH) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Labels exceed maximum length of 500 characters.");
        }
        return joined;
    }

    public static List<String> parseLabels(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    }

    public static IssueActivityEntity newActivity(
        UUID issueId,
        UUID actorId,
        String action,
        String fieldName,
        String oldValue,
        String newValue
    ) {
        IssueActivityEntity activity = new IssueActivityEntity();
        activity.setIssueId(issueId);
        activity.setActorId(actorId);
        activity.setAction(action);
        activity.setFieldName(fieldName);
        activity.setOldValue(truncate(oldValue, MAX_ACTIVITY_VALUE_LENGTH));
        activity.setNewValue(truncate(newValue, MAX_ACTIVITY_VALUE_LENGTH));
        return activity;
    }

    public static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private static <E extends Enum<E>> E parseEnum(String raw, Class<E> enumType, E defaultValue, String label) {
        String trimmed = InputRules.blankToNull(raw);
        if (trimmed == null) {
            return defaultValue;
        }
        try {
            return Enum.valueOf(enumType, trimmed.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Invalid " + label + ": " + trimmed);
        }
    }
}
