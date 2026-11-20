package com.orbit.workspace.repository;

import com.orbit.workspace.entity.WorkspaceRoleEntity;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface WorkspaceRoleRepository extends JpaRepository<WorkspaceRoleEntity, UUID> {

    Optional<WorkspaceRoleEntity> findByIdAndWorkspaceId(UUID id, UUID workspaceId);

    Optional<WorkspaceRoleEntity> findByWorkspaceIdAndNameIgnoreCase(UUID workspaceId, String name);

    boolean existsByWorkspaceIdAndNameIgnoreCase(UUID workspaceId, String name);

    List<WorkspaceRoleEntity> findByWorkspaceIdOrderByCreatedAtAsc(UUID workspaceId);

    @Query("select r.id from WorkspaceRoleEntity r where r.workspaceId = :workspaceId")
    List<UUID> findIdsByWorkspaceId(UUID workspaceId);

    @Query("select r from WorkspaceRoleEntity r where r.id in :ids")
    List<WorkspaceRoleEntity> findAllByIds(Collection<UUID> ids);
}
