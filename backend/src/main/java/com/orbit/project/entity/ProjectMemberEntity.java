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
@Table(name = "project_members")
public class ProjectMemberEntity implements Persistable<ProjectMemberId> {

    @EmbeddedId
    private ProjectMemberId id;

    @Column(name = "role_id", nullable = false)
    private UUID roleId;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    @Transient
    private boolean newEntity = true;

    protected ProjectMemberEntity() {}

    @Override
    public boolean isNew() { return newEntity; }

    @PostLoad
    @PostPersist
    void markNotNew() { newEntity = false; }

    public ProjectMemberEntity(UUID projectId, UUID userId, UUID roleId) {
        this.id = new ProjectMemberId(projectId, userId);
        this.roleId = roleId;
        this.joinedAt = Timestamps.now();
    }

    public ProjectMemberId getId() { return id; }
    public UUID getProjectId() { return id.projectId(); }
    public UUID getUserId() { return id.userId(); }

    public UUID getRoleId() { return roleId; }
    public void setRoleId(UUID roleId) { this.roleId = roleId; }

    public Instant getJoinedAt() { return joinedAt; }
}
