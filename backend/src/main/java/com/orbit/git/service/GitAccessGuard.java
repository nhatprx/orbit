package com.orbit.git.service;

import com.orbit.common.ApiException;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Enforces scope access, module enablement, and RBAC permission keys for Git. */
@Component
public class GitAccessGuard {

    public static final String GIT_MODULE = "git";

    private final WorkspacePermissionEvaluator evaluator;
    private final WorkspaceModuleService workspaceModules;
    private final ProjectModuleRepository projectModules;

    public GitAccessGuard(
        WorkspacePermissionEvaluator evaluator,
        WorkspaceModuleService workspaceModules,
        ProjectModuleRepository projectModules
    ) {
        this.evaluator = evaluator;
        this.workspaceModules = workspaceModules;
        this.projectModules = projectModules;
    }

    public GitScope requireWorkspaceScope(UUID userId, UUID workspaceId, String permissionKey) {
        evaluator.requireWorkspacePermission(userId, workspaceId, permissionKey);
        if (!workspaceModules.enabledKeys(workspaceId).contains(GIT_MODULE)) {
            throw moduleDisabled();
        }
        return GitScope.workspace(workspaceId);
    }

    public GitScope requireProjectScope(UUID userId, UUID workspaceId, UUID projectId, String permissionKey) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, permissionKey);
        boolean enabled = projectModules.findEffectiveEnabled(List.of(projectId)).stream()
            .map(KeyValue::value)
            .anyMatch(GIT_MODULE::equals);
        if (!enabled) {
            throw moduleDisabled();
        }
        return GitScope.project(workspaceId, projectId);
    }

    private static ApiException moduleDisabled() {
        return ApiException.forbidden("MODULE_DISABLED", "The git module is disabled here.");
    }
}
