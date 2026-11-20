package com.orbit.workspace.service;

import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.workspace.dto.WorkspaceModuleDto;
import com.orbit.workspace.entity.ModuleEntity;
import com.orbit.workspace.entity.WorkspaceModuleEntity;
import com.orbit.workspace.entity.WorkspaceModuleId;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.repository.StringCount;
import com.orbit.workspace.repository.WorkspaceModuleRepository;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkspaceModuleService {

    private final WorkspaceModuleRepository workspaceModules;
    private final ProjectModuleRepository projectModules;
    private final ModuleCatalog catalog;
    private final WorkspacePermissionEvaluator evaluator;

    public WorkspaceModuleService(
        WorkspaceModuleRepository workspaceModules,
        ProjectModuleRepository projectModules,
        ModuleCatalog catalog,
        WorkspacePermissionEvaluator evaluator
    ) {
        this.workspaceModules = workspaceModules;
        this.projectModules = projectModules;
        this.catalog = catalog;
        this.evaluator = evaluator;
    }

    /** Writes one row per catalog module so toggles are plain updates. */
    @Transactional
    public void initialize(UUID workspaceId, Collection<String> enabledKeys) {
        workspaceModules.saveAll(
            catalog.all().stream()
                .map(m -> new WorkspaceModuleEntity(
                    workspaceId, m.getModuleKey(), enabledKeys.contains(m.getModuleKey())
                ))
                .toList()
        );
    }

    @Transactional(readOnly = true)
    public Set<String> enabledKeys(UUID workspaceId) {
        return workspaceModules.findByIdWorkspaceId(workspaceId).stream()
            .filter(WorkspaceModuleEntity::isEnabled)
            .map(WorkspaceModuleEntity::getModuleKey)
            .collect(Collectors.toSet());
    }

    @Transactional(readOnly = true)
    public List<WorkspaceModuleDto> list(UUID userId, UUID workspaceId) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.WORKSPACE_VIEW);
        Set<String> enabled = enabledKeys(workspaceId);
        Map<String, Long> counts = projectModules.countEnabledByModule(workspaceId).stream()
            .collect(Collectors.toMap(StringCount::key, StringCount::count));
        return catalog.all().stream()
            .map(m -> toDto(m, enabled.contains(m.getModuleKey()), counts.getOrDefault(m.getModuleKey(), 0L)))
            .toList();
    }

    @Transactional
    public WorkspaceModuleDto set(UUID userId, UUID workspaceId, String moduleKey, boolean enabled) {
        evaluator.requireWorkspacePermission(
            userId, workspaceId, enabled ? Permissions.MODULE_ENABLE : Permissions.MODULE_DISABLE
        );
        ModuleEntity module = catalog.require(moduleKey);
        WorkspaceModuleEntity row = workspaceModules
            .findById(new WorkspaceModuleId(workspaceId, module.getModuleKey()))
            .orElseGet(() -> new WorkspaceModuleEntity(workspaceId, module.getModuleKey(), enabled));
        row.setEnabled(enabled);
        workspaceModules.save(row);

        long activeProjects = projectModules.countEnabledByModule(workspaceId).stream()
            .filter(c -> c.key().equals(module.getModuleKey()))
            .mapToLong(StringCount::count)
            .sum();
        return toDto(module, enabled, activeProjects);
    }

    private static WorkspaceModuleDto toDto(ModuleEntity module, boolean enabled, long activeProjects) {
        return new WorkspaceModuleDto(
            module.getModuleKey(), module.getName(), module.getDescription(), enabled, activeProjects
        );
    }
}
