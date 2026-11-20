package com.orbit.cloud.service;

import com.orbit.cloud.entity.CloudScopeType;
import java.util.UUID;

/** Immutable scope descriptor enforcing strict 3-layer isolation. */
public record CloudScope(CloudScopeType type, UUID scopeId, UUID workspaceId, UUID projectId) {

    public static CloudScope user(UUID userId) {
        return new CloudScope(CloudScopeType.USER, userId, null, null);
    }

    public static CloudScope workspace(UUID workspaceId) {
        return new CloudScope(CloudScopeType.WORKSPACE, workspaceId, workspaceId, null);
    }

    public static CloudScope project(UUID workspaceId, UUID projectId) {
        return new CloudScope(CloudScopeType.PROJECT, projectId, workspaceId, projectId);
    }
}
