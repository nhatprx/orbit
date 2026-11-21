package com.orbit.issues.dto;

import java.util.List;

public record IssueDetailDto(
    IssueDto issue,
    List<IssueDto> subtasks,
    List<IssueCommentDto> comments,
    List<IssueActivityDto> activities
) {}
