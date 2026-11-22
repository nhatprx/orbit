package com.orbit.cloud.service;

import com.orbit.cloud.entity.CloudScopeType;
import com.orbit.common.ApiException;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Enforces 3-layer scope access, module enablement, and RBAC permission keys for Cloud Files. */
@Component
public class CloudAccessGuard {

    public static final String CLOUD_MODULE = "cloud";
    private static final Set<String> CLOUD_FAMILY_MODULES = Set.of("cloud", "docs", "sheets", "slides");

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
        boolean enabled = workspaceModules.enabledKeys(workspaceId).stream()
            .anyMatch(CLOUD_FAMILY_MODULES::contains);
        if (!enabled) {
            throw moduleDisabled();
        }
        return CloudScope.workspace(workspaceId);
    }

    public CloudScope requireProjectScope(UUID userId, UUID workspaceId, UUID projectId, String permissionKey) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, permissionKey);
        boolean enabled = projectModules.findEffectiveEnabled(List.of(projectId)).stream()
            .map(KeyValue::value)
            .anyMatch(CLOUD_FAMILY_MODULES::contains);
        if (!enabled) {
            throw moduleDisabled();
        }
        return CloudScope.project(workspaceId, projectId);
    }

    public CloudScope requireWriteScope(
        UUID userId, CloudScopeType scopeType, UUID workspaceId, UUID projectId
    ) {
        if (scopeType == null) {
            throw ApiException.badRequest("INVALID_SCOPE", "Scope type is required.");
        }
        return switch (scopeType) {
            case USER -> requireUserScope(userId);
            case WORKSPACE -> {
                if (workspaceId == null) {
                    throw ApiException.badRequest("INVALID_SCOPE", "workspaceId is required for WORKSPACE scope.");
                }
                yield requireWorkspaceScope(userId, workspaceId, Permissions.FILES_WRITE);
            }
            case PROJECT -> {
                if (workspaceId == null || projectId == null) {
                    throw ApiException.badRequest(
                        "INVALID_SCOPE", "workspaceId and projectId are required for PROJECT scope."
                    );
                }
                yield requireProjectScope(userId, workspaceId, projectId, Permissions.PFILES_WRITE);
            }
        };
    }

    private static ApiException moduleDisabled() {
        return ApiException.forbidden("MODULE_DISABLED", "The cloud files module is disabled here.");
    }
}
