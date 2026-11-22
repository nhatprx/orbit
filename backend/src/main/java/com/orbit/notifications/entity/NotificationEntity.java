package com.orbit.notifications.entity;

import com.orbit.common.Timestamps;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_notifications")
public class NotificationEntity {
    @Id private UUID id;
    @Column(name = "recipient_id", nullable = false) private UUID recipientId;
    @Column(name = "actor_id") private UUID actorId;
    @Column(name = "workspace_id", nullable = false) private UUID workspaceId;
    @Column(name = "project_id", nullable = false) private UUID projectId;
    @Column(name = "issue_id") private UUID issueId;
    @Column(name = "issue_key", nullable = false, length = 32) private String issueKey;
    @Column(nullable = false, length = 32) private String type;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, length = 500) private String message;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "read_at") private Instant readAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Timestamps.now();
    }

    public UUID getId() { return id; }
    public UUID getRecipientId() { return recipientId; }
    public void setRecipientId(UUID id) { recipientId = id; }
    public UUID getActorId() { return actorId; }
    public void setActorId(UUID id) { actorId = id; }
    public UUID getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(UUID id) { workspaceId = id; }
    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID id) { projectId = id; }
    public UUID getIssueId() { return issueId; }
    public void setIssueId(UUID id) { issueId = id; }
    public String getIssueKey() { return issueKey; }
    public void setIssueKey(String key) { issueKey = key; }
    public String getType() { return type; }
    public void setType(String value) { type = value; }
    public String getTitle() { return title; }
    public void setTitle(String value) { title = value; }
    public String getMessage() { return message; }
    public void setMessage(String value) { message = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getReadAt() { return readAt; }
    public void setReadAt(Instant value) { readAt = value; }
}
