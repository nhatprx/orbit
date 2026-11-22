package com.orbit.collab.dto;

import java.util.UUID;

public record CollabCatalogEvent(
    String type, String module, String action, UUID resourceId, Boolean locked, UUID workspaceId, UUID projectId
) {}
