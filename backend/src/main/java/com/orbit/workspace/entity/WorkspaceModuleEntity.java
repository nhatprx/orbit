package com.orbit.workspace.entity;

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
@Table(name = "workspace_modules")
public class WorkspaceModuleEntity implements Persistable<WorkspaceModuleId> {

    @EmbeddedId
    private WorkspaceModuleId id;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Transient
    private boolean newEntity = true;

    protected WorkspaceModuleEntity() {}

    @Override
    public boolean isNew() { return newEntity; }

    @PostLoad
    @PostPersist
    void markNotNew() { newEntity = false; }

    public WorkspaceModuleEntity(UUID workspaceId, String moduleKey, boolean enabled) {
        this.id = new WorkspaceModuleId(workspaceId, moduleKey);
        this.enabled = enabled;
        this.updatedAt = Timestamps.now();
    }

    public WorkspaceModuleId getId() { return id; }
    public String getModuleKey() { return id.moduleKey(); }

    public boolean isEnabled() { return enabled; }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
        this.updatedAt = Timestamps.now();
    }
}
