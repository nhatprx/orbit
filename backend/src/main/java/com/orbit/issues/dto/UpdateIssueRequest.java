package com.orbit.issues.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record UpdateIssueRequest(
    String type,
    @Size(max = 255, message = "Issue title must be at most 255 characters.")
    String title,
    String description,
    String status,
    String priority,
    @Min(value = 0, message = "Story points must be between 0 and 100.")
    @Max(value = 100, message = "Story points must be between 0 and 100.")
    Integer storyPoints,
    Boolean clearStoryPoints,
    UUID sprintId,
    Boolean clearSprint,
    UUID parentId,
    Boolean clearParent,
    UUID assigneeId,
    Boolean clearAssignee,
    List<String> labels,
    LocalDate dueDate,
    Boolean clearDueDate
) {}
