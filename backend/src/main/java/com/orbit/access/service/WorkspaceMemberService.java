package com.orbit.access.service;

import com.orbit.access.dto.AssignMemberRoleRequest;
import com.orbit.access.dto.MemberDto;
import com.orbit.access.repository.WorkspaceMemberQueries;
import com.orbit.common.ApiException;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import com.orbit.project.repository.ProjectMemberRepository;
import com.orbit.workspace.entity.RoleScope;
import com.orbit.workspace.entity.WorkspaceEntity;
import com.orbit.workspace.entity.WorkspaceMemberEntity;
import com.orbit.workspace.entity.WorkspaceMemberId;
import com.orbit.workspace.entity.WorkspaceRoleEntity;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.WorkspaceAccess;
import com.orbit.workspace.repository.RolePermissionRepository;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import com.orbit.workspace.repository.WorkspaceRepository;
import com.orbit.workspace.repository.WorkspaceRoleRepository;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Workspace membership rules, including BR-07 (exactly one Owner, ownership is transferred). */
@Service
public class WorkspaceMemberService {

    private final WorkspaceRepository workspaces;
    private final WorkspaceMemberRepository members;
    private final WorkspaceMemberQueries queries;
    private final WorkspaceRoleRepository roles;
    private final RolePermissionRepository rolePermissions;
    private final ProjectMemberRepository projectMembers;
    private final WorkspacePermissionEvaluator evaluator;

    public WorkspaceMemberService(
        WorkspaceRepository workspaces,
        WorkspaceMemberRepository members,
        WorkspaceMemberQueries queries,
        WorkspaceRoleRepository roles,
        RolePermissionRepository rolePermissions,
        ProjectMemberRepository projectMembers,
        WorkspacePermissionEvaluator evaluator
    ) {
        this.workspaces = workspaces;
        this.members = members;
        this.queries = queries;
        this.roles = roles;
        this.rolePermissions = rolePermissions;
        this.projectMembers = projectMembers;
        this.evaluator = evaluator;
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberDto> list(UUID userId, UUID workspaceId, int page, int size) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.MEMBER_VIEW);
        return PageResponse.of(queries.findMembers(workspaceId, PageParams.of(page, size)));
    }

    @Transactional
    public MemberDto assignRole(UUID userId, UUID workspaceId, UUID targetUserId, AssignMemberRoleRequest request) {
        WorkspaceAccess access =
            evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.MEMBER_ASSIGN_ROLE);
        WorkspaceEntity workspace = loadActive(workspaceId);
        WorkspaceMemberEntity target = members.findById(new WorkspaceMemberId(workspaceId, targetUserId))
            .orElseThrow(() -> ApiException.notFound("MEMBER_NOT_FOUND", "Member not found."));
        if (targetUserId.equals(workspace.getOwnerId())) {
            throw ownerTransferRequired();
        }
        WorkspaceRoleEntity role = roles.findByIdAndWorkspaceId(request.roleId(), workspaceId)
            .orElseThrow(() -> ApiException.notFound("ROLE_NOT_FOUND", "Role not found."));
        if (role.isImmutable()) {
            throw ownerTransferRequired();
        }
        Set<String> newKeys = rolePermissions.findKeys(role.getId(), RoleScope.WORKSPACE);
        PermissionGuard.requireCanGrant(access.permissions(), role, newKeys);
        requireNotOutranked(access, target);
        target.setRoleId(role.getId());
        members.save(target);
        return queries.findMember(workspaceId, targetUserId).orElseThrow();
    }

    /** Removes a member, or lets a member leave. The Owner can never be removed (BR-07). */
    @Transactional
    public void remove(UUID userId, UUID workspaceId, UUID targetUserId) {
        boolean self = userId.equals(targetUserId);
        WorkspaceAccess access = self
            ? evaluator.requireWorkspaceAccess(userId, workspaceId)
            : evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.MEMBER_REMOVE);
        WorkspaceEntity workspace = loadActive(workspaceId);
        if (targetUserId.equals(workspace.getOwnerId())) {
            throw ownerTransferRequired();
        }
        WorkspaceMemberEntity target = members.findById(new WorkspaceMemberId(workspaceId, targetUserId))
            .orElseThrow(() -> ApiException.notFound("MEMBER_NOT_FOUND", "Member not found."));
        if (!self) {
            requireNotOutranked(access, target);
        }
        projectMembers.deleteUserFromWorkspaceProjects(workspaceId, targetUserId);
        members.deleteMember(workspaceId, targetUserId);
    }

    private void requireNotOutranked(WorkspaceAccess access, WorkspaceMemberEntity target) {
        WorkspaceRoleEntity targetRole = roles.findById(target.getRoleId()).orElseThrow();
        PermissionGuard.requireNotOutranked(
            access.permissions(), targetRole, rolePermissions.findKeys(targetRole.getId(), RoleScope.WORKSPACE)
        );
    }

    private WorkspaceEntity loadActive(UUID workspaceId) {
        return workspaces.findByIdAndDeletedAtIsNull(workspaceId)
            .orElseThrow(() -> ApiException.notFound("WORKSPACE_NOT_FOUND", "Workspace not found."));
    }

    private static ApiException ownerTransferRequired() {
        return ApiException.conflict(
            "OWNER_TRANSFER_REQUIRED", "Transfer ownership before changing or removing the workspace owner."
        );
    }
}
