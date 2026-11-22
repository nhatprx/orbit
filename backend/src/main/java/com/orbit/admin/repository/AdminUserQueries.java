package com.orbit.admin.repository;

import com.orbit.admin.dto.AdminUserWorkspaceDto;
import com.orbit.workspace.entity.WorkspaceMemberEntity;
import com.orbit.workspace.entity.WorkspaceMemberId;
import com.orbit.workspace.repository.KeyCount;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/** Read-side joins for the admin user views (batch counts, so a page never triggers N+1 queries). */
public interface AdminUserQueries extends Repository<WorkspaceMemberEntity, WorkspaceMemberId> {

    @Query("""
        select new com.orbit.workspace.repository.KeyCount(m.id.userId, count(m))
        from WorkspaceMemberEntity m
        join WorkspaceEntity w on w.id = m.id.workspaceId
        where m.id.userId in :userIds and w.deletedAt is null
        group by m.id.userId
        """)
    List<KeyCount> countActiveWorkspaces(Collection<UUID> userIds);

    @Query("""
        select new com.orbit.admin.dto.AdminUserWorkspaceDto(
            w.id, w.name, r.name, case when w.ownerId = m.id.userId then true else false end)
        from WorkspaceMemberEntity m
        join WorkspaceEntity w on w.id = m.id.workspaceId
        join WorkspaceRoleEntity r on r.id = m.roleId
        where m.id.userId = :userId and w.deletedAt is null
        order by w.name asc
        """)
    List<AdminUserWorkspaceDto> findWorkspaces(UUID userId, Pageable pageable);
}
