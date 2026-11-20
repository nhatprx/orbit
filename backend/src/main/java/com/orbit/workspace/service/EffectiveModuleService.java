package com.orbit.workspace.service;

import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.workspace.dto.EffectiveModulesDto;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.repository.KeyValue;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Resolves the modules the Sidebar should render for a Workspace or a Project (MOD-03, MOD-04). */
@Service
public class EffectiveModuleService {

    private final WorkspaceModuleService workspaceModules;
    private final ProjectModuleRepository projectModules;
    private final ModuleCatalog catalog;
    private final WorkspacePermissionEvaluator evaluator;

    public EffectiveModuleService(
        WorkspaceModuleService workspaceModules,
        ProjectModuleRepository projectModules,
        ModuleCatalog catalog,
        WorkspacePermissionEvaluator evaluator
    ) {
        this.workspaceModules = workspaceModules;
        this.projectModules = projectModules;
        this.catalog = catalog;
        this.evaluator = evaluator;
    }

    @Transactional(readOnly = true)
    public EffectiveModulesDto resolve(UUID userId, UUID workspaceId, UUID projectId) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.WORKSPACE_VIEW);
        if (projectId == null) {
            return new EffectiveModulesDto(
                "WORKSPACE", catalog.items(workspaceModules.enabledKeys(workspaceId))
            );
        }
        evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PROJECT_VIEW);
        Set<String> keys = projectModules.findEffectiveEnabled(List.of(projectId)).stream()
            .map(KeyValue::value)
            .collect(Collectors.toSet());
        return new EffectiveModulesDto("PROJECT", catalog.items(keys));
    }
}
