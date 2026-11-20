package com.orbit.workspace.repository;

import com.orbit.workspace.entity.RolePermissionEntity;
import com.orbit.workspace.entity.RoleScope;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface RolePermissionRepository extends JpaRepository<RolePermissionEntity, UUID> {

    @Query("select rp.permissionKey from RolePermissionEntity rp where rp.roleId = :roleId and rp.roleScope = :scope")
    Set<String> findKeys(UUID roleId, RoleScope scope);

    @Query("""
        select new com.orbit.workspace.repository.KeyValue(rp.roleId, rp.permissionKey)
        from RolePermissionEntity rp
        where rp.roleId in :roleIds and rp.roleScope = :scope
        """)
    List<KeyValue> findKeysForRoles(Collection<UUID> roleIds, RoleScope scope);

    @Modifying
    @Query("delete from RolePermissionEntity rp where rp.roleId = :roleId and rp.roleScope = :scope")
    int deleteForRole(UUID roleId, RoleScope scope);

    @Modifying
    @Query("""
        delete from RolePermissionEntity rp
        where rp.roleId = :roleId and rp.roleScope = :scope and rp.permissionKey in :keys
        """)
    int deleteForRoleAndKeys(UUID roleId, RoleScope scope, Collection<String> keys);

    @Modifying
    @Query("delete from RolePermissionEntity rp where rp.roleId in :roleIds and rp.roleScope = :scope")
    int deleteForRoles(Collection<UUID> roleIds, RoleScope scope);
}
