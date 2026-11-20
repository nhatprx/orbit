package com.orbit.project.repository;

import com.orbit.project.entity.ProjectRoleEntity;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProjectRoleRepository extends JpaRepository<ProjectRoleEntity, UUID> {

    Optional<ProjectRoleEntity> findByIdAndProjectId(UUID id, UUID projectId);

    Optional<ProjectRoleEntity> findByProjectIdAndNameIgnoreCase(UUID projectId, String name);

    boolean existsByProjectIdAndNameIgnoreCase(UUID projectId, String name);

    List<ProjectRoleEntity> findByProjectIdOrderByCreatedAtAsc(UUID projectId);

    @Query("select r.id from ProjectRoleEntity r where r.projectId in :projectIds")
    List<UUID> findIdsByProjectIds(Collection<UUID> projectIds);

    @Query("select r from ProjectRoleEntity r where r.id in :ids")
    List<ProjectRoleEntity> findAllByIds(Collection<UUID> ids);
}
