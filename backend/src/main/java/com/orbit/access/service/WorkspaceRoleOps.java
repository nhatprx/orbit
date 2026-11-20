package com.orbit.access.service;

import com.orbit.workspace.entity.BaseRoleEntity;
import com.orbit.workspace.entity.RoleScope;
import com.orbit.workspace.entity.WorkspaceRoleEntity;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.repository.KeyCount;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import com.orbit.workspace.repository.WorkspaceRoleRepository;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
class WorkspaceRoleOps implements RoleScopeOps {

    private final WorkspaceRoleRepository roles;
    private final WorkspaceMemberRepository members;

    WorkspaceRoleOps(WorkspaceRoleRepository roles, WorkspaceMemberRepository members) {
        this.roles = roles;
        this.members = members;
    }

    @Override
    public RoleScope scope() {
        return RoleScope.WORKSPACE;
    }

    @Override
    public boolean isValidKey(String key) {
        return Permissions.isWorkspaceKey(key);
    }

    @Override
    public List<BaseRoleEntity> list(UUID ownerId) {
        return List.<BaseRoleEntity>copyOf(roles.findByWorkspaceIdOrderByCreatedAtAsc(ownerId));
    }

    @Override
    public Optional<BaseRoleEntity> find(UUID ownerId, UUID roleId) {
        return roles.findByIdAndWorkspaceId(roleId, ownerId).map(BaseRoleEntity.class::cast);
    }

    @Override
    public boolean nameTaken(UUID ownerId, String name) {
        return roles.existsByWorkspaceIdAndNameIgnoreCase(ownerId, name);
    }

    @Override
    public BaseRoleEntity create(UUID ownerId, String name) {
        return roles.save(new WorkspaceRoleEntity(ownerId, name, false, false));
    }

    @Override
    public void save(BaseRoleEntity role) {
        roles.save((WorkspaceRoleEntity) role);
    }

    @Override
    public void delete(BaseRoleEntity role) {
        roles.delete((WorkspaceRoleEntity) role);
    }

    @Override
    public Map<UUID, Long> memberCounts(Collection<UUID> roleIds) {
        return roleIds.isEmpty() ? Map.of() : KeyCount.toMap(members.countByRoleIds(roleIds));
    }
}
