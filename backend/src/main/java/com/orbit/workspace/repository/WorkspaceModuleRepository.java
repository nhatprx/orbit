package com.orbit.workspace.repository;

import com.orbit.workspace.entity.WorkspaceModuleEntity;
import com.orbit.workspace.entity.WorkspaceModuleId;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface WorkspaceModuleRepository
    extends JpaRepository<WorkspaceModuleEntity, WorkspaceModuleId> {

    List<WorkspaceModuleEntity> findByIdWorkspaceId(UUID workspaceId);

    @Query("""
        select new com.orbit.workspace.repository.KeyValue(wm.id.workspaceId, wm.id.moduleKey)
        from WorkspaceModuleEntity wm
        join ModuleEntity mo on mo.moduleKey = wm.id.moduleKey
        where wm.id.workspaceId in :workspaceIds and wm.enabled = true
        order by mo.sortOrder
        """)
    List<KeyValue> findEnabledForWorkspaces(Collection<UUID> workspaceIds);
}
