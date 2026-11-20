package com.orbit.workspace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "workspace_roles")
public class WorkspaceRoleEntity extends BaseRoleEntity {

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    protected WorkspaceRoleEntity() {}

    public WorkspaceRoleEntity(UUID workspaceId, String name, boolean system, boolean immutable) {
        this.workspaceId = workspaceId;
        setName(name);
        setSystem(system);
        setImmutable(immutable);
    }

    public UUID getWorkspaceId() { return workspaceId; }
}
