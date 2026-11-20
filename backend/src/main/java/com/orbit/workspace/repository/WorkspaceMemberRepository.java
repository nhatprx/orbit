package com.orbit.workspace.repository;

import com.orbit.workspace.entity.WorkspaceMemberEntity;
import com.orbit.workspace.entity.WorkspaceMemberId;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface WorkspaceMemberRepository
    extends JpaRepository<WorkspaceMemberEntity, WorkspaceMemberId> {

    long countByIdWorkspaceId(UUID workspaceId);

    long countByRoleId(UUID roleId);

    boolean existsByIdWorkspaceIdAndIdUserId(UUID workspaceId, UUID userId);

    @Query("""
        select new com.orbit.workspace.repository.KeyCount(m.id.workspaceId, count(m))
        from WorkspaceMemberEntity m
        where m.id.workspaceId in :workspaceIds
        group by m.id.workspaceId
        """)
    List<KeyCount> countByWorkspaceIds(Collection<UUID> workspaceIds);

    @Query("""
        select new com.orbit.workspace.repository.KeyCount(m.roleId, count(m))
        from WorkspaceMemberEntity m
        where m.roleId in :roleIds
        group by m.roleId
        """)
    List<KeyCount> countByRoleIds(Collection<UUID> roleIds);

    @Query("""
        select new com.orbit.workspace.repository.MemberAccessRow(m.roleId, w.deletedAt, w.ownerId)
        from WorkspaceMemberEntity m
        join WorkspaceEntity w on w.id = m.id.workspaceId
        where m.id.workspaceId = :workspaceId and m.id.userId = :userId
        """)
    Optional<MemberAccessRow> findAccess(UUID workspaceId, UUID userId);

    @Query("""
        select new com.orbit.workspace.repository.KeyValue(m.id.workspaceId, rp.permissionKey)
        from WorkspaceMemberEntity m
        join RolePermissionEntity rp
          on rp.roleId = m.roleId and rp.roleScope = com.orbit.workspace.entity.RoleScope.WORKSPACE
        where m.id.userId = :userId and m.id.workspaceId in :workspaceIds
        """)
    List<KeyValue> findPermissionKeys(UUID userId, Collection<UUID> workspaceIds);

    @Modifying
    @Query("delete from WorkspaceMemberEntity m where m.id.workspaceId = :workspaceId and m.id.userId = :userId")
    int deleteMember(UUID workspaceId, UUID userId);
}
