package com.orbit.whiteboard.service;

import java.util.UUID;

/** Immutable scope descriptor enforcing strict workspace/project isolation for Whiteboards. */
public record WhiteboardScope(UUID workspaceId, UUID projectId) {

    public boolean isProject() {
        return projectId != null;
    }

    public static WhiteboardScope workspace(UUID workspaceId) {
        return new WhiteboardScope(workspaceId, null);
    }

    public static WhiteboardScope project(UUID workspaceId, UUID projectId) {
        return new WhiteboardScope(workspaceId, projectId);
    }
}
