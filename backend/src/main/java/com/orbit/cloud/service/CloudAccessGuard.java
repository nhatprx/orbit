package com.orbit.cloud.service;

import com.orbit.common.ApiException;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Enforces 3-layer scope access, module enablement, and RBAC permission keys for Cloud Files. */
@Component
public class CloudAccessGuard {

    public static final String CLOUD_MODULE = "cloud";

    private final WorkspacePermissionEvaluator evaluator;
    private final WorkspaceModuleService workspaceModules;
    private final ProjectModuleRepository projectModules;

    public CloudAccessGuard(
        WorkspacePermissionEvaluator evaluator,
        WorkspaceModuleService workspaceModules,
        ProjectModuleRepository projectModules
    ) {
        this.evaluator = evaluator;
        this.workspaceModules = workspaceModules;
        this.projectModules = projectModules;
    }

    public CloudScope requireUserScope(UUID userId) {
        return CloudScope.user(userId);
    }

    public CloudScope requireWorkspaceScope(UUID userId, UUID workspaceId, String permissionKey) {
        evaluator.requireWorkspacePermission(userId, workspaceId, permissionKey);
        if (!workspaceModules.enabledKeys(workspaceId).contains(CLOUD_MODULE)) {
            throw moduleDisabled();
        }
        return CloudScope.workspace(workspaceId);
    }

    public CloudScope requireProjectScope(UUID userId, UUID workspaceId, UUID projectId, String permissionKey) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, permissionKey);
        boolean enabled = projectModules.findEffectiveEnabled(List.of(projectId)).stream()
            .map(KeyValue::value)
            .anyMatch(CLOUD_MODULE::equals);
        if (!enabled) {
            throw moduleDisabled();
        }
        return CloudScope.project(workspaceId, projectId);
    }

    private static ApiException moduleDisabled() {
        return ApiException.forbidden("MODULE_DISABLED", "The cloud files module is disabled here.");
    }
}
