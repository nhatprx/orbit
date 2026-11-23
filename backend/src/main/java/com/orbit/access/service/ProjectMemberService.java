package com.orbit.access.service;

import com.orbit.access.dto.AddProjectMemberRequest;
import com.orbit.access.dto.AssignMemberRoleRequest;
import com.orbit.access.dto.MemberDto;
import com.orbit.access.repository.ProjectMemberQueries;
import com.orbit.common.ApiException;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import com.orbit.project.entity.ProjectMemberEntity;
import com.orbit.project.entity.ProjectMemberId;
import com.orbit.project.entity.ProjectRoleEntity;
import com.orbit.project.repository.ProjectMemberRepository;
import com.orbit.project.repository.ProjectRoleRepository;
import com.orbit.workspace.entity.RoleScope;
import com.orbit.workspace.entity.WorkspaceMemberId;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.ProjectAccess;
import com.orbit.workspace.repository.RolePermissionRepository;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Project membership. Only existing Workspace members can join a Project. */
@Service
public class ProjectMemberService {

    private final ProjectMemberRepository members;
    private final ProjectMemberQueries queries;
    private final ProjectRoleRepository roles;
    private final WorkspaceMemberRepository workspaceMembers;
    private final RolePermissionRepository rolePermissions;
    private final WorkspacePermissionEvaluator evaluator;

    public ProjectMemberService(
        ProjectMemberRepository members,
        ProjectMemberQueries queries,
        ProjectRoleRepository roles,
        WorkspaceMemberRepository workspaceMembers,
        RolePermissionRepository rolePermissions,
        WorkspacePermissionEvaluator evaluator
    ) {
        this.members = members;
        this.queries = queries;
        this.roles = roles;
        this.workspaceMembers = workspaceMembers;
        this.rolePermissions = rolePermissions;
        this.evaluator = evaluator;
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberDto> list(UUID userId, UUID workspaceId, UUID projectId, int page, int size) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PROJECT_VIEW);
        return PageResponse.of(queries.findMembers(projectId, PageParams.of(page, size)));
    }

    @Transactional
    public MemberDto add(UUID userId, UUID workspaceId, UUID projectId, AddProjectMemberRequest request) {
        ProjectAccess access =
            evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PMEMBER_INVITE);
        if (!workspaceMembers.existsById(new WorkspaceMemberId(workspaceId, request.userId()))) {
            throw ApiException.badRequest("NOT_WORKSPACE_MEMBER", "Only workspace members can join a project.");
        }
        if (members.existsById(new ProjectMemberId(projectId, request.userId()))) {
            throw ApiException.conflict("ALREADY_MEMBER", "This user is already a project member.");
        }
        ProjectRoleEntity role = requireRole(projectId, request.roleId());
        PermissionGuard.requireCanGrant(access.permissions(), role, keys(role.getId()));
        members.save(new ProjectMemberEntity(projectId, request.userId(), role.getId()));
        return queries.findMember(projectId, request.userId()).orElseThrow();
    }

    @Transactional
    public MemberDto assignRole(
        UUID userId, UUID workspaceId, UUID projectId, UUID targetUserId, AssignMemberRoleRequest request
    ) {
        ProjectAccess access =
            evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PMEMBER_ASSIGN_ROLE);
        ProjectMemberEntity target = requireMember(projectId, targetUserId);
        ProjectRoleEntity role = requireRole(projectId, request.roleId());
        PermissionGuard.requireCanGrant(access.permissions(), role, keys(role.getId()));
        requireNotOutranked(access, target);
        if (!role.isImmutable()) {
            guardLastOwner(projectId, target);
        }
        target.setRoleId(role.getId());
        members.save(target);
        return queries.findMember(projectId, targetUserId).orElseThrow();
    }

    @Transactional
    public MemberDto updateSubRole(UUID userId, UUID workspaceId, UUID projectId, UUID targetUserId, String rawSubRole) {
        if (userId.equals(targetUserId)) {
            evaluator.requireProjectAccess(userId, workspaceId, projectId);
        } else {
            evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PMEMBER_ASSIGN_ROLE);
        }
        ProjectMemberEntity target = requireMember(projectId, targetUserId);
        String trimmed = rawSubRole == null ? "" : rawSubRole.trim();
        target.setSubRole(trimmed.isEmpty() ? null : trimmed.substring(0, Math.min(trimmed.length(), 64)));
        members.save(target);
        return queries.findMember(projectId, targetUserId).orElseThrow();
    }

    /** Removes a member or lets one leave; the last project Owner can never go. */
    @Transactional
    public void remove(UUID userId, UUID workspaceId, UUID projectId, UUID targetUserId) {
        boolean self = userId.equals(targetUserId);
        ProjectAccess access = self
            ? evaluator.requireProjectAccess(userId, workspaceId, projectId)
            : evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PMEMBER_REMOVE);
        ProjectMemberEntity target = requireMember(projectId, targetUserId);
        if (!self) {
            requireNotOutranked(access, target);
        }
        guardLastOwner(projectId, target);
        members.deleteMember(projectId, targetUserId);
    }

    private void requireNotOutranked(ProjectAccess access, ProjectMemberEntity target) {
        ProjectRoleEntity targetRole = roles.findById(target.getRoleId()).orElseThrow();
        PermissionGuard.requireNotOutranked(access.permissions(), targetRole, keys(targetRole.getId()));
    }

    private void guardLastOwner(UUID projectId, ProjectMemberEntity target) {
        boolean targetIsOwner = roles.findById(target.getRoleId()).map(ProjectRoleEntity::isImmutable).orElse(false);
        if (targetIsOwner && queries.countOwners(projectId) <= 1) {
            throw ApiException.conflict("LAST_PROJECT_OWNER", "A project must keep at least one owner.");
        }
    }

    private ProjectMemberEntity requireMember(UUID projectId, UUID userId) {
        return members.findById(new ProjectMemberId(projectId, userId))
            .orElseThrow(() -> ApiException.notFound("MEMBER_NOT_FOUND", "Member not found."));
    }

    private ProjectRoleEntity requireRole(UUID projectId, UUID roleId) {
        return roles.findByIdAndProjectId(roleId, projectId)
            .orElseThrow(() -> ApiException.notFound("ROLE_NOT_FOUND", "Role not found."));
    }

    private Set<String> keys(UUID roleId) {
        return rolePermissions.findKeys(roleId, RoleScope.PROJECT);
    }
}
