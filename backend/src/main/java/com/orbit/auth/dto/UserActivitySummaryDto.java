package com.orbit.auth.dto;

public record UserActivitySummaryDto(
    long workspaceCount,
    long projectCount,
    long messagesTotal,
    long messagesLast30Days,
    int activeDaysLast30Days,
    String lastActiveAt
) {}
