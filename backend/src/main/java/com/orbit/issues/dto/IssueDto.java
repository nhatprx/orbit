package com.orbit.issues.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record IssueDto(
    UUID id,
    UUID workspaceId,
    UUID projectId,
    String projectName,
    int issueNumber,
    String issueKey,
    String type,
    String title,
    String description,
    String status,
    String priority,
    Integer storyPoints,
    UUID sprintId,
    String sprintName,
    UUID parentId,
    String parentKey,
    UUID assigneeId,
    String assigneeName,
    UUID reporterId,
    String reporterName,
    List<String> labels,
    LocalDate dueDate,
    int subtaskCount,
    int completedSubtaskCount,
    int commentCount,
    Instant createdAt,
    Instant updatedAt
) {}
