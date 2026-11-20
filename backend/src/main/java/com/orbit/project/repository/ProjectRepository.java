package com.orbit.project.repository;

import com.orbit.project.entity.ProjectEntity;
import com.orbit.workspace.repository.KeyCount;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProjectRepository extends JpaRepository<ProjectEntity, UUID> {

    Optional<ProjectEntity> findByIdAndWorkspaceIdAndDeletedAtIsNull(UUID id, UUID workspaceId);

    boolean existsByWorkspaceIdAndSlugIgnoreCase(UUID workspaceId, String slug);

    Page<ProjectEntity> findByWorkspaceIdAndDeletedAtIsNull(UUID workspaceId, Pageable pageable);

    @Query("select p.id from ProjectEntity p where p.workspaceId = :workspaceId and p.deletedAt is null")
    List<UUID> findActiveIdsByWorkspaceId(UUID workspaceId);

    @Query("select p.id from ProjectEntity p where p.workspaceId = :workspaceId")
    List<UUID> findAllIdsByWorkspaceId(UUID workspaceId);

    @Query(
        value = """
            select p from ProjectEntity p
            join ProjectMemberEntity pm on pm.id.projectId = p.id
            where p.workspaceId = :workspaceId and p.deletedAt is null and pm.id.userId = :userId
            """,
        countQuery = """
            select count(p) from ProjectEntity p
            join ProjectMemberEntity pm on pm.id.projectId = p.id
            where p.workspaceId = :workspaceId and p.deletedAt is null and pm.id.userId = :userId
            """
    )
    Page<ProjectEntity> findMemberProjects(UUID workspaceId, UUID userId, Pageable pageable);

    @Query("""
        select new com.orbit.workspace.repository.KeyCount(p.workspaceId, count(p))
        from ProjectEntity p
        where p.workspaceId in :workspaceIds and p.deletedAt is null
        group by p.workspaceId
        """)
    List<KeyCount> countActiveByWorkspaceIds(Collection<UUID> workspaceIds);

    @Query(
        value = """
            select p from ProjectEntity p
            join WorkspaceEntity w on w.id = p.workspaceId
            join WorkspaceMemberEntity wm on wm.id.workspaceId = w.id and wm.id.userId = :userId
            where p.deletedAt is null and w.deletedAt is null
              and (w.ownerId = :userId
                or exists (
                    select 1 from RolePermissionEntity rp
                    where rp.roleId = wm.roleId
                      and rp.roleScope = com.orbit.workspace.entity.RoleScope.WORKSPACE
                      and rp.permissionKey in ('project.view_all', 'workspace.edit'))
                or exists (
                    select 1 from ProjectMemberEntity pm
                    where pm.id.projectId = p.id and pm.id.userId = :userId))
            order by w.name asc, p.name asc
            """,
        countQuery = """
            select count(p) from ProjectEntity p
            join WorkspaceEntity w on w.id = p.workspaceId
            join WorkspaceMemberEntity wm on wm.id.workspaceId = w.id and wm.id.userId = :userId
            where p.deletedAt is null and w.deletedAt is null
              and (w.ownerId = :userId
                or exists (
                    select 1 from RolePermissionEntity rp
                    where rp.roleId = wm.roleId
                      and rp.roleScope = com.orbit.workspace.entity.RoleScope.WORKSPACE
                      and rp.permissionKey in ('project.view_all', 'workspace.edit'))
                or exists (
                    select 1 from ProjectMemberEntity pm
                    where pm.id.projectId = p.id and pm.id.userId = :userId))
            """
    )
    Page<ProjectEntity> findVisibleAcrossWorkspaces(UUID userId, Pageable pageable);
}
