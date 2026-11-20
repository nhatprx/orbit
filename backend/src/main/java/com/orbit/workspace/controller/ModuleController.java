package com.orbit.workspace.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.project.service.ProjectModuleService;
import com.orbit.workspace.dto.EffectiveModulesDto;
import com.orbit.workspace.dto.ModuleCatalogItemDto;
import com.orbit.workspace.dto.ProjectModuleDto;
import com.orbit.workspace.dto.ToggleModuleRequest;
import com.orbit.workspace.dto.WorkspaceModuleDto;
import com.orbit.workspace.service.EffectiveModuleService;
import com.orbit.workspace.service.ModuleCatalog;
import com.orbit.workspace.service.WorkspaceModuleService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ModuleController {

    private final ModuleCatalog catalog;
    private final WorkspaceModuleService workspaceModules;
    private final ProjectModuleService projectModules;
    private final EffectiveModuleService effectiveModules;

    public ModuleController(
        ModuleCatalog catalog,
        WorkspaceModuleService workspaceModules,
        ProjectModuleService projectModules,
        EffectiveModuleService effectiveModules
    ) {
        this.catalog = catalog;
        this.workspaceModules = workspaceModules;
        this.projectModules = projectModules;
        this.effectiveModules = effectiveModules;
    }

    @GetMapping("/modules")
    public List<ModuleCatalogItemDto> catalog() {
        return catalog.items(null);
    }

    @GetMapping("/workspaces/{workspaceId}/modules")
    public List<WorkspaceModuleDto> listWorkspaceModules(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId
    ) {
        return workspaceModules.list(principal.userId(), workspaceId);
    }

    @PutMapping("/workspaces/{workspaceId}/modules/{moduleKey}")
    public WorkspaceModuleDto setWorkspaceModule(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable String moduleKey,
        @Valid @RequestBody ToggleModuleRequest request
    ) {
        return workspaceModules.set(principal.userId(), workspaceId, moduleKey, request.enabled());
    }

    @GetMapping("/workspaces/{workspaceId}/projects/{projectId}/modules")
    public List<ProjectModuleDto> listProjectModules(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId
    ) {
        return projectModules.list(principal.userId(), workspaceId, projectId);
    }

    @PutMapping("/workspaces/{workspaceId}/projects/{projectId}/modules/{moduleKey}")
    public ProjectModuleDto setProjectModule(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable String moduleKey,
        @Valid @RequestBody ToggleModuleRequest request
    ) {
        return projectModules.set(principal.userId(), workspaceId, projectId, moduleKey, request.enabled());
    }

    @GetMapping("/workspaces/{workspaceId}/effective-modules")
    public EffectiveModulesDto effective(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @RequestParam(required = false) UUID projectId
    ) {
        return effectiveModules.resolve(principal.userId(), workspaceId, projectId);
    }
}
