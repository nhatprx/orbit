package com.orbit.project.event;

import java.util.UUID;

public record ProjectCreatedEvent(
    UUID projectId,
    UUID workspaceId,
    UUID creatorId,
    boolean chatEnabled
) {}
