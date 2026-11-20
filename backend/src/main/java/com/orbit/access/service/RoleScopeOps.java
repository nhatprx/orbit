package com.orbit.access.service;

import com.orbit.workspace.entity.BaseRoleEntity;
import com.orbit.workspace.entity.RoleScope;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Storage operations that differ between Workspace roles and Project roles. */
interface RoleScopeOps {

    RoleScope scope();

    boolean isValidKey(String key);

    List<BaseRoleEntity> list(UUID ownerId);

    Optional<BaseRoleEntity> find(UUID ownerId, UUID roleId);

    boolean nameTaken(UUID ownerId, String name);

    /** Persists and returns a new non-system role. */
    BaseRoleEntity create(UUID ownerId, String name);

    void save(BaseRoleEntity role);

    void delete(BaseRoleEntity role);

    Map<UUID, Long> memberCounts(Collection<UUID> roleIds);
}
