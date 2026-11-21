package com.orbit.issues.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateIssueCommentRequest(
    @NotBlank(message = "Comment body is required.")
    @Size(max = 4000, message = "Comment body must be at most 4000 characters.")
    String body
) {}
