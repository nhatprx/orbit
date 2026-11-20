package com.orbit.workspace.service;

import com.orbit.project.entity.ProjectRoleEntity;
import com.orbit.project.repository.ProjectRoleRepository;
import com.orbit.workspace.entity.RolePermissionEntity;
import com.orbit.workspace.entity.RoleScope;
import com.orbit.workspace.entity.WorkspaceRoleEntity;
import com.orbit.workspace.permission.SystemRole;
import com.orbit.workspace.repository.RolePermissionRepository;
import com.orbit.workspace.repository.WorkspaceRoleRepository;
import java.util.Collection;
import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Seeds the Owner, Admin and Member system roles for a new Workspace or Project. */
@Component
public class SystemRoleSeeder {

    public record SeededRoles(Map<SystemRole, UUID> ids) {
        public UUID ownerRoleId() { return ids.get(SystemRole.OWNER); }
        public UUID adminRoleId() { return ids.get(SystemRole.ADMIN); }
        public UUID memberRoleId() { return ids.get(SystemRole.MEMBER); }
    }

    private final WorkspaceRoleRepository workspaceRoles;
    private final ProjectRoleRepository projectRoles;
    private final RolePermissionRepository rolePermissions;

    public SystemRoleSeeder(
        WorkspaceRoleRepository workspaceRoles,
        ProjectRoleRepository projectRoles,
        RolePermissionRepository rolePermissions
    ) {
        this.workspaceRoles = workspaceRoles;
        this.projectRoles = projectRoles;
        this.rolePermissions = rolePermissions;
    }

    public SeededRoles seedWorkspaceRoles(UUID workspaceId) {
        Map<SystemRole, UUID> ids = new EnumMap<>(SystemRole.class);
        for (SystemRole role : SystemRole.values()) {
            WorkspaceRoleEntity saved = workspaceRoles.save(
                new WorkspaceRoleEntity(workspaceId, role.displayName(), true, role.immutable())
            );
            savePermissions(saved.getId(), RoleScope.WORKSPACE, role.workspacePermissions());
            ids.put(role, saved.getId());
        }
        return new SeededRoles(ids);
    }

    public SeededRoles seedProjectRoles(UUID projectId) {
        Map<SystemRole, UUID> ids = new EnumMap<>(SystemRole.class);
        for (SystemRole role : SystemRole.values()) {
            ProjectRoleEntity saved = projectRoles.save(
                new ProjectRoleEntity(projectId, role.displayName(), true, role.immutable())
            );
            savePermissions(saved.getId(), RoleScope.PROJECT, role.projectPermissions());
            ids.put(role, saved.getId());
        }
        return new SeededRoles(ids);
    }

    private void savePermissions(UUID roleId, RoleScope scope, Collection<String> keys) {
        rolePermissions.saveAll(
            keys.stream().map(key -> new RolePermissionEntity(roleId, scope, key)).toList()
        );
    }
}
