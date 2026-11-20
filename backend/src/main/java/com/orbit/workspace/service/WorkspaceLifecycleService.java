package com.orbit.workspace.service;

import com.orbit.common.ApiException;
import com.orbit.common.Timestamps;
import com.orbit.workspace.dto.DeleteWorkspaceRequest;
import com.orbit.workspace.dto.TransferOwnershipRequest;
import com.orbit.workspace.dto.WorkspaceDto;
import com.orbit.workspace.entity.WorkspaceEntity;
import com.orbit.workspace.entity.WorkspaceMemberEntity;
import com.orbit.workspace.entity.WorkspaceMemberId;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.SystemRole;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import com.orbit.workspace.repository.WorkspaceRepository;
import com.orbit.workspace.repository.WorkspaceRoleRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Soft delete, restore and ownership transfer (BR-04, BR-07, BR-08, BR-14). */
@Service
public class WorkspaceLifecycleService {

    private final WorkspaceRepository workspaces;
    private final WorkspaceMemberRepository members;
    private final WorkspaceRoleRepository roles;
    private final WorkspaceAssembler assembler;
    private final WorkspacePermissionEvaluator evaluator;
    private final Duration retention;

    public WorkspaceLifecycleService(
        WorkspaceRepository workspaces,
        WorkspaceMemberRepository members,
        WorkspaceRoleRepository roles,
        WorkspaceAssembler assembler,
        WorkspacePermissionEvaluator evaluator,
        @Value("${orbit.workspace.retention-days:30}") long retentionDays
    ) {
        this.workspaces = workspaces;
        this.members = members;
        this.roles = roles;
        this.assembler = assembler;
        this.evaluator = evaluator;
        this.retention = Duration.ofDays(retentionDays);
    }

    @Transactional
    public WorkspaceDto softDelete(UUID userId, UUID workspaceId, DeleteWorkspaceRequest request) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.WORKSPACE_DELETE);
        evaluator.requireWorkspaceOwner(userId, workspaceId);

        WorkspaceEntity workspace = lockActive(workspaceId);
        if (!workspace.getName().equals(request.confirmName())) {
            throw ApiException.badRequest(
                "CONFIRMATION_NAME_MISMATCH", "Confirmation name does not match the workspace name."
            );
        }
        Instant now = Timestamps.now();
        workspace.setDeletedAt(now);
        workspace.setPurgeAfter(now.plus(retention));
        return assembler.assembleOne(userId, workspaces.save(workspace));
    }

    @Transactional
    public WorkspaceDto restore(UUID userId, UUID workspaceId) {
        WorkspaceEntity workspace = workspaces.findByIdForUpdate(workspaceId)
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Workspace not found."));
        if (!members.existsById(new WorkspaceMemberId(workspaceId, userId))) {
            throw ApiException.notFound("NOT_FOUND", "Workspace not found.");
        }
        if (!workspace.getOwnerId().equals(userId)) {
            throw ApiException.forbidden("FORBIDDEN", "Only the workspace owner can restore it.");
        }
        if (!workspace.isDeleted()) {
            throw ApiException.conflict("WORKSPACE_NOT_DELETED", "Workspace is not deleted.");
        }
        if (!Timestamps.now().isBefore(workspace.getPurgeAfter())) {
            throw ApiException.notFound("WORKSPACE_NOT_FOUND", "The restore window has expired.");
        }
        workspace.setDeletedAt(null);
        workspace.setPurgeAfter(null);
        return assembler.assembleOne(userId, workspaces.save(workspace));
    }

    @Transactional
    public WorkspaceDto transferOwnership(UUID userId, UUID workspaceId, TransferOwnershipRequest request) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.WORKSPACE_TRANSFER_OWNER);
        evaluator.requireWorkspaceOwner(userId, workspaceId);
        WorkspaceEntity workspace = lockActive(workspaceId);

        if (request.targetUserId().equals(userId)) {
            throw ApiException.badRequest("VALIDATION_ERROR", "You already own this workspace.");
        }
        WorkspaceMemberEntity target = members.findById(new WorkspaceMemberId(workspaceId, request.targetUserId()))
            .orElseThrow(() -> ApiException.badRequest(
                "TARGET_NOT_MEMBER", "The new owner must already be a member of the workspace."
            ));
        WorkspaceMemberEntity current = members.findById(new WorkspaceMemberId(workspaceId, userId))
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Workspace not found."));

        current.setRoleId(systemRoleId(workspaceId, SystemRole.ADMIN));
        target.setRoleId(systemRoleId(workspaceId, SystemRole.OWNER));
        workspace.setOwnerId(request.targetUserId());
        members.save(current);
        members.save(target);
        return assembler.assembleOne(userId, workspaces.save(workspace));
    }

    private WorkspaceEntity lockActive(UUID workspaceId) {
        return workspaces.findByIdForUpdate(workspaceId)
            .filter(w -> !w.isDeleted())
            .orElseThrow(() -> ApiException.notFound("WORKSPACE_NOT_FOUND", "Workspace not found."));
    }

    private UUID systemRoleId(UUID workspaceId, SystemRole role) {
        return roles.findByWorkspaceIdAndNameIgnoreCase(workspaceId, role.displayName())
            .orElseThrow(() -> new IllegalStateException("Missing system role " + role.displayName()))
            .getId();
    }
}
