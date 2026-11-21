package com.orbit.issues.entity;

import com.orbit.common.Timestamps;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Monotonic per-project counter so issue keys are allocated atomically and never reused. */
@Entity
@Table(name = "project_issue_counters")
public class ProjectIssueCounterEntity {

    @Id
    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "last_issue_number", nullable = false)
    private int lastIssueNumber;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Timestamps.now();
    }

    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }
    public int getLastIssueNumber() { return lastIssueNumber; }
    public void setLastIssueNumber(int lastIssueNumber) { this.lastIssueNumber = lastIssueNumber; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
