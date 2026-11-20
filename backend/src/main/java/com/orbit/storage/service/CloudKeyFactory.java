package com.orbit.storage.service;

import java.util.UUID;

/** Builds immutable UUID-based S3 object keys for the 3 Cloud Files layers. */
public final class CloudKeyFactory {

    private CloudKeyFactory() {}

    public static String userKey(UUID userId, UUID nodeId) {
        return "cloud/users/" + userId + "/" + nodeId + "/" + UUID.randomUUID();
    }

    public static String workspaceKey(UUID workspaceId, UUID nodeId) {
        return "cloud/workspaces/" + workspaceId + "/" + nodeId + "/" + UUID.randomUUID();
    }

    public static String projectKey(UUID projectId, UUID nodeId) {
        return "cloud/projects/" + projectId + "/" + nodeId + "/" + UUID.randomUUID();
    }
}
