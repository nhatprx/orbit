package com.orbit.notifications.dto;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(
    UUID id,
    String type,
    String title,
    String message,
    UUID actorId,
    String actorName,
    UUID workspaceId,
    UUID projectId,
    UUID issueId,
    String issueKey,
    Instant createdAt,
    Instant readAt
) {}
