package com.orbit.project.service;

import com.orbit.common.ApiException;
import com.orbit.project.entity.ProjectModuleEntity;
import com.orbit.project.entity.ProjectModuleId;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.workspace.dto.ProjectModuleDto;
import com.orbit.workspace.entity.ModuleEntity;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.service.ModuleCatalog;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectModuleService {

    private final ProjectModuleRepository projectModules;
    private final WorkspaceModuleService workspaceModules;
    private final ModuleCatalog catalog;
    private final WorkspacePermissionEvaluator evaluator;

    public ProjectModuleService(
        ProjectModuleRepository projectModules,
        WorkspaceModuleService workspaceModules,
        ModuleCatalog catalog,
        WorkspacePermissionEvaluator evaluator
    ) {
        this.projectModules = projectModules;
        this.workspaceModules = workspaceModules;
        this.catalog = catalog;
        this.evaluator = evaluator;
    }

    @Transactional(readOnly = true)
    public List<ProjectModuleDto> list(UUID userId, UUID workspaceId, UUID projectId) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PROJECT_VIEW);
        Set<String> inWorkspace = workspaceModules.enabledKeys(workspaceId);
        Set<String> inProject = enabledKeys(projectId);
        return catalog.all().stream()
            .map(m -> toDto(m, inWorkspace.contains(m.getModuleKey()), inProject.contains(m.getModuleKey())))
            .toList();
    }

    /** BR-02: a Project can only enable modules currently enabled on its Workspace. */
    @Transactional
    public ProjectModuleDto set(UUID userId, UUID workspaceId, UUID projectId, String moduleKey, boolean enabled) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PMODULE_SELECT);
        ModuleEntity module = catalog.require(moduleKey);
        boolean inWorkspace = workspaceModules.enabledKeys(workspaceId).contains(module.getModuleKey());
        if (enabled && !inWorkspace) {
            throw ApiException.badRequest(
                "MODULE_NOT_ENABLED_IN_WORKSPACE", "Enable this module on the workspace first."
            );
        }
        ProjectModuleEntity row = projectModules
            .findById(new ProjectModuleId(projectId, module.getModuleKey()))
            .orElseGet(() -> new ProjectModuleEntity(projectId, module.getModuleKey(), enabled));
        row.setEnabled(enabled);
        projectModules.save(row);
        return toDto(module, inWorkspace, enabled);
    }

    private Set<String> enabledKeys(UUID projectId) {
        return projectModules.findByIdProjectId(projectId).stream()
            .filter(ProjectModuleEntity::isEnabled)
            .map(ProjectModuleEntity::getModuleKey)
            .collect(Collectors.toSet());
    }

    private static ProjectModuleDto toDto(ModuleEntity m, boolean inWorkspace, boolean inProject) {
        return new ProjectModuleDto(
            m.getModuleKey(), m.getName(), m.getDescription(), inWorkspace, inProject, inWorkspace && inProject
        );
    }
}
