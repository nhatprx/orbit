package com.orbit.access.service;

import com.orbit.access.dto.CreateRoleRequest;
import com.orbit.access.dto.RoleDto;
import com.orbit.access.dto.UpdateRoleRequest;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.WorkspaceAccess;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class WorkspaceRoleService {

    private final RoleEngine engine;
    private final WorkspaceRoleOps ops;
    private final WorkspacePermissionEvaluator evaluator;

    WorkspaceRoleService(RoleEngine engine, WorkspaceRoleOps ops, WorkspacePermissionEvaluator evaluator) {
        this.engine = engine;
        this.ops = ops;
        this.evaluator = evaluator;
    }

    public List<RoleDto> list(UUID userId, UUID workspaceId) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.ROLE_VIEW);
        return engine.list(ops, workspaceId);
    }

    public RoleDto create(UUID userId, UUID workspaceId, CreateRoleRequest request) {
        WorkspaceAccess access = evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.ROLE_CREATE);
        return engine.create(ops, workspaceId, access.permissions(), request);
    }

    public RoleDto update(UUID userId, UUID workspaceId, UUID roleId, UpdateRoleRequest request) {
        WorkspaceAccess access = evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.ROLE_EDIT);
        return engine.update(ops, workspaceId, roleId, access.permissions(), request);
    }

    public void delete(UUID userId, UUID workspaceId, UUID roleId) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.ROLE_DELETE);
        engine.delete(ops, workspaceId, roleId);
    }
}
