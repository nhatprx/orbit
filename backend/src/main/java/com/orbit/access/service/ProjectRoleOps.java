package com.orbit.access.service;

import com.orbit.project.entity.ProjectRoleEntity;
import com.orbit.project.repository.ProjectMemberRepository;
import com.orbit.project.repository.ProjectRoleRepository;
import com.orbit.workspace.entity.BaseRoleEntity;
import com.orbit.workspace.entity.RoleScope;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.repository.KeyCount;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
class ProjectRoleOps implements RoleScopeOps {

    private final ProjectRoleRepository roles;
    private final ProjectMemberRepository members;

    ProjectRoleOps(ProjectRoleRepository roles, ProjectMemberRepository members) {
        this.roles = roles;
        this.members = members;
    }

    @Override
    public RoleScope scope() {
        return RoleScope.PROJECT;
    }

    @Override
    public boolean isValidKey(String key) {
        return Permissions.isProjectKey(key);
    }

    @Override
    public List<BaseRoleEntity> list(UUID ownerId) {
        return List.<BaseRoleEntity>copyOf(roles.findByProjectIdOrderByCreatedAtAsc(ownerId));
    }

    @Override
    public Optional<BaseRoleEntity> find(UUID ownerId, UUID roleId) {
        return roles.findByIdAndProjectId(roleId, ownerId).map(BaseRoleEntity.class::cast);
    }

    @Override
    public boolean nameTaken(UUID ownerId, String name) {
        return roles.existsByProjectIdAndNameIgnoreCase(ownerId, name);
    }

    @Override
    public BaseRoleEntity create(UUID ownerId, String name) {
        return roles.save(new ProjectRoleEntity(ownerId, name, false, false));
    }

    @Override
    public void save(BaseRoleEntity role) {
        roles.save((ProjectRoleEntity) role);
    }

    @Override
    public void delete(BaseRoleEntity role) {
        roles.delete((ProjectRoleEntity) role);
    }

    @Override
    public Map<UUID, Long> memberCounts(Collection<UUID> roleIds) {
        return roleIds.isEmpty() ? Map.of() : KeyCount.toMap(members.countByRoleIds(roleIds));
    }
}
