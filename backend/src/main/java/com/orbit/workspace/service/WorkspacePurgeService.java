package com.orbit.workspace.service;

import com.orbit.common.Timestamps;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.project.repository.ProjectRoleRepository;
import com.orbit.workspace.entity.RoleScope;
import com.orbit.workspace.entity.WorkspaceEntity;
import com.orbit.workspace.event.WorkspacePurgingEvent;
import com.orbit.workspace.repository.RolePermissionRepository;
import com.orbit.workspace.repository.WorkspaceRepository;
import com.orbit.workspace.repository.WorkspaceRoleRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Permanently removes Workspaces whose restore window elapsed (WS-06). */
@Service
public class WorkspacePurgeService {

    private final WorkspaceRepository workspaces;
    private final WorkspaceRoleRepository workspaceRoles;
    private final ProjectRepository projects;
    private final ProjectRoleRepository projectRoles;
    private final RolePermissionRepository rolePermissions;
    private final ApplicationEventPublisher events;

    public WorkspacePurgeService(
        WorkspaceRepository workspaces,
        WorkspaceRoleRepository workspaceRoles,
        ProjectRepository projects,
        ProjectRoleRepository projectRoles,
        RolePermissionRepository rolePermissions,
        ApplicationEventPublisher events
    ) {
        this.workspaces = workspaces;
        this.workspaceRoles = workspaceRoles;
        this.projects = projects;
        this.projectRoles = projectRoles;
        this.rolePermissions = rolePermissions;
        this.events = events;
    }

    /** Purges up to {@code batchSize} expired Workspaces in a single transaction. */
    @Transactional
    public int purgeExpired(int batchSize) {
        List<WorkspaceEntity> expired = workspaces.findByDeletedAtIsNotNullAndPurgeAfterLessThanEqual(
            Timestamps.now(), PageRequest.of(0, Math.max(1, batchSize))
        );
        expired.forEach(this::purge);
        return expired.size();
    }

    private void purge(WorkspaceEntity workspace) {
        UUID workspaceId = workspace.getId();
        List<UUID> projectIds = projects.findAllIdsByWorkspaceId(workspaceId);

        rolePermissions.deleteForRoles(workspaceRoles.findIdsByWorkspaceId(workspaceId), RoleScope.WORKSPACE);
        if (!projectIds.isEmpty()) {
            rolePermissions.deleteForRoles(projectRoles.findIdsByProjectIds(projectIds), RoleScope.PROJECT);
        }
        events.publishEvent(new WorkspacePurgingEvent(workspaceId, projectIds));
        workspaces.delete(workspace);
    }
}
