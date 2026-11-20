package com.orbit.workspace.permission;

import com.orbit.common.ApiException;
import com.orbit.project.repository.ProjectMemberRepository;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.entity.RoleScope;
import com.orbit.workspace.repository.RolePermissionRepository;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Single authority for permission-key checks. Callers never compare role names. */
@Component
public class WorkspacePermissionEvaluator {

    public record WorkspaceAccess(boolean member, boolean active, boolean owner, Set<String> permissions) {
        static final WorkspaceAccess NONE = new WorkspaceAccess(false, false, false, Set.of());
    }

    public record ProjectAccess(WorkspaceAccess workspace, Set<String> permissions) {}

    private final WorkspaceMemberRepository workspaceMembers;
    private final RolePermissionRepository rolePermissions;
    private final ProjectRepository projects;
    private final ProjectMemberRepository projectMembers;

    public WorkspacePermissionEvaluator(
        WorkspaceMemberRepository workspaceMembers,
        RolePermissionRepository rolePermissions,
        ProjectRepository projects,
        ProjectMemberRepository projectMembers
    ) {
        this.workspaceMembers = workspaceMembers;
        this.rolePermissions = rolePermissions;
        this.projects = projects;
        this.projectMembers = projectMembers;
    }

    public WorkspaceAccess resolveWorkspace(UUID userId, UUID workspaceId) {
        return workspaceMembers.findAccess(workspaceId, userId)
            .map(row -> {
                boolean active = row.workspaceDeletedAt() == null;
                Set<String> keys = active
                    ? rolePermissions.findKeys(row.roleId(), RoleScope.WORKSPACE)
                    : Set.of();
                return new WorkspaceAccess(true, active, userId.equals(row.ownerId()), keys);
            })
            .orElse(WorkspaceAccess.NONE);
    }

    public WorkspaceAccess requireWorkspaceAccess(UUID userId, UUID workspaceId) {
        WorkspaceAccess access = resolveWorkspace(userId, workspaceId);
        if (!access.member()) {
            throw ApiException.notFound("NOT_FOUND", "Workspace not found.");
        }
        if (!access.active()) {
            throw ApiException.notFound("WORKSPACE_NOT_FOUND", "Workspace not found.");
        }
        return access;
    }

    public Set<String> getWorkspacePermissions(UUID userId, UUID workspaceId) {
        WorkspaceAccess access = resolveWorkspace(userId, workspaceId);
        return access.active() ? access.permissions() : Set.of();
    }

    public boolean hasWorkspacePermission(UUID userId, UUID workspaceId, String permissionKey) {
        return getWorkspacePermissions(userId, workspaceId).contains(permissionKey);
    }

    public WorkspaceAccess requireWorkspacePermission(UUID userId, UUID workspaceId, String permissionKey) {
        WorkspaceAccess access = requireWorkspaceAccess(userId, workspaceId);
        if (!access.permissions().contains(permissionKey)) {
            throw forbidden();
        }
        return access;
    }

    public void requireWorkspaceOwner(UUID userId, UUID workspaceId) {
        if (!requireWorkspaceAccess(userId, workspaceId).owner()) {
            throw forbidden();
        }
    }

    public ProjectAccess requireProjectAccess(UUID userId, UUID workspaceId, UUID projectId) {
        WorkspaceAccess workspace = requireWorkspacePermission(userId, workspaceId, Permissions.WORKSPACE_VIEW);
        projects.findByIdAndWorkspaceIdAndDeletedAtIsNull(projectId, workspaceId)
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Project not found."));

        Optional<UUID> roleId = projectMembers.findRoleId(projectId, userId);
        Set<String> explicit = roleId
            .map(id -> rolePermissions.findKeys(id, RoleScope.PROJECT))
            .orElse(Set.of());
        Set<String> effective = ProjectPermissionPolicy.effective(
            workspace.permissions(), workspace.owner(), roleId.isPresent(), explicit
        );
        if (!effective.contains(Permissions.PROJECT_VIEW)) {
            throw ApiException.notFound("NOT_FOUND", "Project not found.");
        }
        return new ProjectAccess(workspace, effective);
    }

    public ProjectAccess requireProjectPermission(
        UUID userId, UUID workspaceId, UUID projectId, String permissionKey
    ) {
        ProjectAccess access = requireProjectAccess(userId, workspaceId, projectId);
        if (!access.permissions().contains(permissionKey)) {
            throw forbidden();
        }
        return access;
    }

    public Set<String> getProjectPermissions(UUID userId, UUID workspaceId, UUID projectId) {
        try {
            return requireProjectAccess(userId, workspaceId, projectId).permissions();
        } catch (ApiException ex) {
            return Set.of();
        }
    }

    public boolean hasProjectPermission(
        UUID userId, UUID workspaceId, UUID projectId, String permissionKey
    ) {
        return getProjectPermissions(userId, workspaceId, projectId).contains(permissionKey);
    }

    private static ApiException forbidden() {
        return ApiException.forbidden("FORBIDDEN", "You do not have permission to perform this action.");
    }
}
