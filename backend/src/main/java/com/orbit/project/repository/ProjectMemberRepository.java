package com.orbit.project.repository;

import com.orbit.project.entity.ProjectMemberEntity;
import com.orbit.project.entity.ProjectMemberId;
import com.orbit.workspace.repository.KeyCount;
import com.orbit.workspace.repository.KeyValue;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ProjectMemberRepository
    extends JpaRepository<ProjectMemberEntity, ProjectMemberId> {

    long countByIdProjectId(UUID projectId);

    long countByRoleId(UUID roleId);

    boolean existsByIdProjectIdAndIdUserId(UUID projectId, UUID userId);

    @Query("""
        select new com.orbit.workspace.repository.KeyCount(pm.id.projectId, count(pm))
        from ProjectMemberEntity pm
        where pm.id.projectId in :projectIds
        group by pm.id.projectId
        """)
    List<KeyCount> countByProjectIds(Collection<UUID> projectIds);

    @Query("""
        select new com.orbit.workspace.repository.KeyCount(pm.roleId, count(pm))
        from ProjectMemberEntity pm
        where pm.roleId in :roleIds
        group by pm.roleId
        """)
    List<KeyCount> countByRoleIds(Collection<UUID> roleIds);

    @Query("select pm.roleId from ProjectMemberEntity pm where pm.id.projectId = :projectId and pm.id.userId = :userId")
    Optional<UUID> findRoleId(UUID projectId, UUID userId);

    @Query("select pm.id.projectId from ProjectMemberEntity pm where pm.id.userId = :userId and pm.id.projectId in :projectIds")
    List<UUID> findMemberProjectIds(UUID userId, Collection<UUID> projectIds);

    @Query("""
        select new com.orbit.workspace.repository.KeyValue(pm.id.projectId, rp.permissionKey)
        from ProjectMemberEntity pm
        join RolePermissionEntity rp
          on rp.roleId = pm.roleId and rp.roleScope = com.orbit.workspace.entity.RoleScope.PROJECT
        where pm.id.userId = :userId and pm.id.projectId in :projectIds
        """)
    List<KeyValue> findPermissionKeys(UUID userId, Collection<UUID> projectIds);

    @Modifying
    @Query("delete from ProjectMemberEntity pm where pm.id.projectId = :projectId and pm.id.userId = :userId")
    int deleteMember(UUID projectId, UUID userId);

    @Modifying
    @Query("""
        delete from ProjectMemberEntity pm
        where pm.id.userId = :userId
          and pm.id.projectId in (select p.id from ProjectEntity p where p.workspaceId = :workspaceId)
        """)
    int deleteUserFromWorkspaceProjects(UUID workspaceId, UUID userId);
}
