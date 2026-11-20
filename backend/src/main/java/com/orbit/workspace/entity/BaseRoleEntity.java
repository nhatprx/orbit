package com.orbit.workspace.entity;

import com.orbit.common.Timestamps;
import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import java.time.Instant;
import java.util.UUID;

@MappedSuperclass
public abstract class BaseRoleEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "is_system", nullable = false)
    private boolean system;

    @Column(name = "is_immutable", nullable = false)
    private boolean immutable;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Timestamps.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public boolean isSystem() { return system; }
    public void setSystem(boolean system) { this.system = system; }

    public boolean isImmutable() { return immutable; }
    public void setImmutable(boolean immutable) { this.immutable = immutable; }

    public Instant getCreatedAt() { return createdAt; }
}
