package com.orbit.workspace.event;

import java.util.List;
import java.util.UUID;

/** Published before a Workspace row is hard-deleted so modules can remove polymorphic data. */
public record WorkspacePurgingEvent(UUID workspaceId, List<UUID> projectIds) {}
