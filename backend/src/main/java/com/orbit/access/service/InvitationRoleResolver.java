package com.orbit.access.service;

import com.orbit.access.entity.InvitationEntity;
import com.orbit.common.ApiException;
import com.orbit.project.entity.ProjectRoleEntity;
import com.orbit.project.repository.ProjectRoleRepository;
import com.orbit.workspace.entity.BaseRoleEntity;
import com.orbit.workspace.entity.RoleScope;
import com.orbit.workspace.entity.WorkspaceRoleEntity;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.SystemRole;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.ProjectAccess;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.WorkspaceAccess;
import com.orbit.workspace.repository.RolePermissionRepository;
import com.orbit.workspace.repository.WorkspaceRoleRepository;
import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Decides which role an invitation carries when created and which roles it applies when accepted. */
@Component
class InvitationRoleResolver {

    private final WorkspacePermissionEvaluator evaluator;
    private final WorkspaceRoleRepository workspaceRoles;
    private final ProjectRoleRepository projectRoles;
    private final RolePermissionRepository rolePermissions;

    InvitationRoleResolver(
        WorkspacePermissionEvaluator evaluator,
        WorkspaceRoleRepository workspaceRoles,
        ProjectRoleRepository projectRoles,
        RolePermissionRepository rolePermissions
    ) {
        this.evaluator = evaluator;
        this.workspaceRoles = workspaceRoles;
        this.projectRoles = projectRoles;
        this.rolePermissions = rolePermissions;
    }

    /** Validates the requested role (default: Member) against what the inviter may grant. */
    UUID resolveForCreate(UUID userId, UUID workspaceId, UUID projectId, UUID requestedRoleId) {
        if (projectId == null) {
            WorkspaceAccess access = evaluator.requireWorkspaceAccess(userId, workspaceId);
            WorkspaceRoleEntity role = requestedRoleId == null
                ? workspaceRoles.findByWorkspaceIdAndNameIgnoreCase(workspaceId, SystemRole.MEMBER.displayName())
                    .orElseThrow()
                : workspaceRoles.findByIdAndWorkspaceId(requestedRoleId, workspaceId)
                    .orElseThrow(() -> ApiException.notFound("ROLE_NOT_FOUND", "Role not found."));
            assertGrantable(role, rolePermissions.findKeys(role.getId(), RoleScope.WORKSPACE), access.permissions());
            return role.getId();
        }
        ProjectAccess access =
            evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PMEMBER_INVITE);
        ProjectRoleEntity role = requestedRoleId == null
            ? projectRoles.findByProjectIdAndNameIgnoreCase(projectId, SystemRole.MEMBER.displayName()).orElseThrow()
            : projectRoles.findByIdAndProjectId(requestedRoleId, projectId)
                .orElseThrow(() -> ApiException.notFound("ROLE_NOT_FOUND", "Role not found."));
        assertGrantable(role, rolePermissions.findKeys(role.getId(), RoleScope.PROJECT), access.permissions());
        return role.getId();
    }

    UUID defaultWorkspaceRoleId(UUID workspaceId) {
        return workspaceRoles.findByWorkspaceIdAndNameIgnoreCase(workspaceId, SystemRole.MEMBER.displayName())
            .orElseThrow()
            .getId();
    }

    /** Project invitations join the Workspace as a plain Member; workspace invitations use their own role. */
    UUID workspaceRoleToApply(InvitationEntity invitation) {
        UUID memberRole = defaultWorkspaceRoleId(invitation.getWorkspaceId());
        if (invitation.getProjectId() != null) return memberRole;
        return workspaceRoles.findByIdAndWorkspaceId(invitation.getRoleId(), invitation.getWorkspaceId())
            .filter(role -> !role.isImmutable())
            .map(BaseRoleEntity::getId)
            .orElse(memberRole);
    }

    /** Falls back to the project Member role if the invited role was deleted in the meantime. */
    UUID projectRoleToApply(InvitationEntity invitation) {
        UUID projectId = invitation.getProjectId();
        return projectRoles.findByIdAndProjectId(invitation.getRoleId(), projectId)
            .filter(role -> !role.isImmutable())
            .map(BaseRoleEntity::getId)
            .orElseGet(() -> projectRoles
                .findByProjectIdAndNameIgnoreCase(projectId, SystemRole.MEMBER.displayName())
                .orElseThrow()
                .getId());
    }

    private static void assertGrantable(BaseRoleEntity role, Collection<String> keys, Set<String> caller) {
        if (role.isImmutable()) {
            throw ApiException.badRequest("VALIDATION_ERROR", "The Owner role cannot be granted by invitation.");
        }
        PermissionGuard.requireCanGrant(caller, role, keys);
    }
}
