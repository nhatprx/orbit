package com.orbit.git.service;

import com.orbit.git.entity.GitScopeType;
import java.util.UUID;

/** Immutable scope descriptor enforcing strict workspace/project isolation for Git. */
public record GitScope(GitScopeType type, UUID scopeId, UUID workspaceId, UUID projectId) {

    public static GitScope workspace(UUID workspaceId) {
        return new GitScope(GitScopeType.WORKSPACE, workspaceId, workspaceId, null);
    }

    public static GitScope project(UUID workspaceId, UUID projectId) {
        return new GitScope(GitScopeType.PROJECT, projectId, workspaceId, projectId);
    }
}
