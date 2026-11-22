package com.orbit.whiteboard.service;

import com.orbit.common.ApiException;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Enforces scope membership, RBAC permission keys, and module enablement for Whiteboards. */
@Component
public class WhiteboardAccessGuard {

    public static final String WHITEBOARD_MODULE = "whiteboard";

    private final WorkspacePermissionEvaluator evaluator;
    private final WorkspaceModuleService workspaceModules;
    private final ProjectModuleRepository projectModules;

    public WhiteboardAccessGuard(
        WorkspacePermissionEvaluator evaluator,
        WorkspaceModuleService workspaceModules,
        ProjectModuleRepository projectModules
    ) {
        this.evaluator = evaluator;
        this.workspaceModules = workspaceModules;
        this.projectModules = projectModules;
    }

    public WhiteboardScope requireWorkspaceScope(UUID userId, UUID workspaceId, String permissionKey) {
        evaluator.requireWorkspacePermission(userId, workspaceId, permissionKey);
        if (!workspaceModules.enabledKeys(workspaceId).contains(WHITEBOARD_MODULE)) {
            throw moduleDisabled();
        }
        return WhiteboardScope.workspace(workspaceId);
    }

    public WhiteboardScope requireProjectScope(UUID userId, UUID workspaceId, UUID projectId, String permissionKey) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, permissionKey);
        boolean enabled = projectModules.findEffectiveEnabled(List.of(projectId)).stream()
            .map(KeyValue::value)
            .anyMatch(WHITEBOARD_MODULE::equals);
        if (!enabled) {
            throw moduleDisabled();
        }
        return WhiteboardScope.project(workspaceId, projectId);
    }

    private static ApiException moduleDisabled() {
        return ApiException.forbidden("MODULE_DISABLED", "The whiteboard module is disabled here.");
    }
}
