package com.orbit.project.entity;

import com.orbit.workspace.entity.BaseRoleEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "project_roles")
public class ProjectRoleEntity extends BaseRoleEntity {

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    protected ProjectRoleEntity() {}

    public ProjectRoleEntity(UUID projectId, String name, boolean system, boolean immutable) {
        this.projectId = projectId;
        setName(name);
        setSystem(system);
        setImmutable(immutable);
    }

    public UUID getProjectId() { return projectId; }
}
