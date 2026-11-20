package com.orbit.project.entity;

import com.orbit.common.Timestamps;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Persistable;

@Entity
@Table(name = "project_modules")
public class ProjectModuleEntity implements Persistable<ProjectModuleId> {

    @EmbeddedId
    private ProjectModuleId id;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Transient
    private boolean newEntity = true;

    protected ProjectModuleEntity() {}

    @Override
    public boolean isNew() { return newEntity; }

    @PostLoad
    @PostPersist
    void markNotNew() { newEntity = false; }

    public ProjectModuleEntity(UUID projectId, String moduleKey, boolean enabled) {
        this.id = new ProjectModuleId(projectId, moduleKey);
        this.enabled = enabled;
        this.updatedAt = Timestamps.now();
    }

    public ProjectModuleId getId() { return id; }
    public String getModuleKey() { return id.moduleKey(); }

    public boolean isEnabled() { return enabled; }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
        this.updatedAt = Timestamps.now();
    }
}
