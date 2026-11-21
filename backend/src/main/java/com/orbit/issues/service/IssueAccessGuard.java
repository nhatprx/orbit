package com.orbit.issues.service;

import com.orbit.common.ApiException;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.ProjectAccess;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.WorkspaceAccess;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Enforces RBAC permission keys and module enablement for the Issues & Sprints module. */
@Component
public class IssueAccessGuard {

    public static final String ISSUES_MODULE = "issues";

    private final ProjectRepository projects;
    private final ProjectModuleRepository projectModules;
    private final WorkspaceModuleService workspaceModules;
    private final WorkspacePermissionEvaluator evaluator;

    public IssueAccessGuard(
        ProjectRepository projects,
        ProjectModuleRepository projectModules,
        WorkspaceModuleService workspaceModules,
        WorkspacePermissionEvaluator evaluator
    ) {
        this.projects = projects;
        this.projectModules = projectModules;
        this.workspaceModules = workspaceModules;
        this.evaluator = evaluator;
    }

    public ProjectEntity requireProjectPermission(
        UUID userId, UUID workspaceId, UUID projectId, String... anyOfPermissions
    ) {
        ProjectAccess access = requireProjectAccessWithModule(userId, workspaceId, projectId);
        boolean allowed = false;
        for (String key : anyOfPermissions) {
            if (access.permissions().contains(key)) {
                allowed = true;
                break;
            }
        }
        if (!allowed) {
            throw ApiException.forbidden("FORBIDDEN", "You do not have permission to perform this action.");
        }
        return loadProject(workspaceId, projectId);
    }

    public ProjectAccess requireProjectAccessWithModule(UUID userId, UUID workspaceId, UUID projectId) {
        ProjectAccess access = evaluator.requireProjectAccess(userId, workspaceId, projectId);
        boolean enabled = projectModules.findEffectiveEnabled(List.of(projectId)).stream()
            .map(KeyValue::value)
            .anyMatch(ISSUES_MODULE::equals);
        if (!enabled) {
            throw moduleDisabled();
        }
        return access;
    }

    public WorkspaceAccess requireWorkspaceIssuesAccess(UUID userId, UUID workspaceId) {
        WorkspaceAccess access = evaluator.requireWorkspaceAccess(userId, workspaceId);
        Set<String> perms = access.permissions();
        if (!perms.contains(Permissions.ISSUES_READ) && !perms.contains(Permissions.WORKSPACE_VIEW)) {
            throw ApiException.forbidden("FORBIDDEN", "You do not have permission to view workspace issues.");
        }
        if (!workspaceModules.enabledKeys(workspaceId).contains(ISSUES_MODULE)) {
            throw moduleDisabled();
        }
        return access;
    }

    public ProjectEntity loadProject(UUID workspaceId, UUID projectId) {
        return projects.findByIdAndWorkspaceIdAndDeletedAtIsNull(projectId, workspaceId)
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Project not found."));
    }

    private static ApiException moduleDisabled() {
        return ApiException.forbidden("MODULE_DISABLED", "The issues module is disabled here.");
    }
}
