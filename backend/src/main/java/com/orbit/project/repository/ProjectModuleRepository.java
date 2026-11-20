package com.orbit.project.repository;

import com.orbit.project.entity.ProjectModuleEntity;
import com.orbit.project.entity.ProjectModuleId;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.repository.StringCount;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProjectModuleRepository
    extends JpaRepository<ProjectModuleEntity, ProjectModuleId> {

    List<ProjectModuleEntity> findByIdProjectId(UUID projectId);

    /** Modules enabled both on the project and on its parent Workspace (BR-02, BR-09). */
    @Query("""
        select new com.orbit.workspace.repository.KeyValue(pm.id.projectId, pm.id.moduleKey)
        from ProjectModuleEntity pm
        join ProjectEntity p on p.id = pm.id.projectId
        join WorkspaceModuleEntity wm
          on wm.id.workspaceId = p.workspaceId and wm.id.moduleKey = pm.id.moduleKey
        join ModuleEntity mo on mo.moduleKey = pm.id.moduleKey
        where pm.id.projectId in :projectIds and pm.enabled = true and wm.enabled = true
        order by mo.sortOrder
        """)
    List<KeyValue> findEffectiveEnabled(Collection<UUID> projectIds);

    @Query("""
        select new com.orbit.workspace.repository.StringCount(pm.id.moduleKey, count(pm))
        from ProjectModuleEntity pm
        join ProjectEntity p on p.id = pm.id.projectId
        where p.workspaceId = :workspaceId and p.deletedAt is null and pm.enabled = true
        group by pm.id.moduleKey
        """)
    List<StringCount> countEnabledByModule(UUID workspaceId);
}
