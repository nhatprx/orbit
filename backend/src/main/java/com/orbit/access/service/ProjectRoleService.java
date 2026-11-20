package com.orbit.access.service;

import com.orbit.access.dto.CreateRoleRequest;
import com.orbit.access.dto.RoleDto;
import com.orbit.access.dto.UpdateRoleRequest;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.ProjectAccess;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ProjectRoleService {

    private final RoleEngine engine;
    private final ProjectRoleOps ops;
    private final WorkspacePermissionEvaluator evaluator;

    ProjectRoleService(RoleEngine engine, ProjectRoleOps ops, WorkspacePermissionEvaluator evaluator) {
        this.engine = engine;
        this.ops = ops;
        this.evaluator = evaluator;
    }

    public List<RoleDto> list(UUID userId, UUID workspaceId, UUID projectId) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PROJECT_VIEW);
        return engine.list(ops, projectId);
    }

    public RoleDto create(UUID userId, UUID workspaceId, UUID projectId, CreateRoleRequest request) {
        ProjectAccess access =
            evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PROLE_CREATE);
        return engine.create(ops, projectId, access.permissions(), request);
    }

    public RoleDto update(UUID userId, UUID workspaceId, UUID projectId, UUID roleId, UpdateRoleRequest request) {
        ProjectAccess access =
            evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PROLE_EDIT);
        return engine.update(ops, projectId, roleId, access.permissions(), request);
    }

    public void delete(UUID userId, UUID workspaceId, UUID projectId, UUID roleId) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PROLE_DELETE);
        engine.delete(ops, projectId, roleId);
    }
}
