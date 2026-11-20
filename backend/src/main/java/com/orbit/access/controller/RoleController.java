package com.orbit.access.controller;

import com.orbit.access.dto.CreateRoleRequest;
import com.orbit.access.dto.RoleDto;
import com.orbit.access.dto.UpdateRoleRequest;
import com.orbit.access.service.ProjectRoleService;
import com.orbit.access.service.WorkspaceRoleService;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}")
public class RoleController {

    private final WorkspaceRoleService workspaceRoles;
    private final ProjectRoleService projectRoles;

    public RoleController(WorkspaceRoleService workspaceRoles, ProjectRoleService projectRoles) {
        this.workspaceRoles = workspaceRoles;
        this.projectRoles = projectRoles;
    }

    @GetMapping("/roles")
    public List<RoleDto> listWorkspaceRoles(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @PathVariable UUID workspaceId
    ) {
        return workspaceRoles.list(principal.userId(), workspaceId);
    }

    @PostMapping("/roles")
    @ResponseStatus(HttpStatus.CREATED)
    public RoleDto createWorkspaceRole(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @Valid @RequestBody CreateRoleRequest request
    ) {
        return workspaceRoles.create(principal.userId(), workspaceId, request);
    }

    @PatchMapping("/roles/{roleId}")
    public RoleDto updateWorkspaceRole(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID roleId,
        @Valid @RequestBody UpdateRoleRequest request
    ) {
        return workspaceRoles.update(principal.userId(), workspaceId, roleId, request);
    }

    @DeleteMapping("/roles/{roleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWorkspaceRole(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID roleId
    ) {
        workspaceRoles.delete(principal.userId(), workspaceId, roleId);
    }

    @GetMapping("/projects/{projectId}/roles")
    public List<RoleDto> listProjectRoles(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId
    ) {
        return projectRoles.list(principal.userId(), workspaceId, projectId);
    }

    @PostMapping("/projects/{projectId}/roles")
    @ResponseStatus(HttpStatus.CREATED)
    public RoleDto createProjectRole(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @Valid @RequestBody CreateRoleRequest request
    ) {
        return projectRoles.create(principal.userId(), workspaceId, projectId, request);
    }

    @PatchMapping("/projects/{projectId}/roles/{roleId}")
    public RoleDto updateProjectRole(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID roleId,
        @Valid @RequestBody UpdateRoleRequest request
    ) {
        return projectRoles.update(principal.userId(), workspaceId, projectId, roleId, request);
    }

    @DeleteMapping("/projects/{projectId}/roles/{roleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProjectRole(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID roleId
    ) {
        projectRoles.delete(principal.userId(), workspaceId, projectId, roleId);
    }
}
