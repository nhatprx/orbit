package com.orbit.cloud.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cloud_upload_sessions")
public class CloudUploadSessionEntity {

    @Id
    private UUID id;

    @Column(name = "node_id", nullable = false)
    private UUID nodeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", nullable = false, length = 16)
    private CloudScopeType scopeType;

    @Column(name = "scope_id", nullable = false)
    private UUID scopeId;

    @Column(name = "storage_key", nullable = false, length = 512)
    private String storageKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CloudUploadStrategy strategy;

    @Column(name = "s3_upload_id", length = 255)
    private String s3UploadId;

    @Column(name = "expected_size_bytes", nullable = false)
    private long expectedSizeBytes;

    @Column(name = "part_size_bytes", nullable = false)
    private long partSizeBytes;

    @Column(name = "total_parts", nullable = false)
    private int totalParts;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CloudUploadSessionStatus status = CloudUploadSessionStatus.OPEN;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getNodeId() { return nodeId; }
    public void setNodeId(UUID nodeId) { this.nodeId = nodeId; }
    public CloudScopeType getScopeType() { return scopeType; }
    public void setScopeType(CloudScopeType scopeType) { this.scopeType = scopeType; }
    public UUID getScopeId() { return scopeId; }
    public void setScopeId(UUID scopeId) { this.scopeId = scopeId; }
    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }
    public CloudUploadStrategy getStrategy() { return strategy; }
    public void setStrategy(CloudUploadStrategy strategy) { this.strategy = strategy; }
    public String getS3UploadId() { return s3UploadId; }
    public void setS3UploadId(String s3UploadId) { this.s3UploadId = s3UploadId; }
    public long getExpectedSizeBytes() { return expectedSizeBytes; }
    public void setExpectedSizeBytes(long expectedSizeBytes) { this.expectedSizeBytes = expectedSizeBytes; }
    public long getPartSizeBytes() { return partSizeBytes; }
    public void setPartSizeBytes(long partSizeBytes) { this.partSizeBytes = partSizeBytes; }
    public int getTotalParts() { return totalParts; }
    public void setTotalParts(int totalParts) { this.totalParts = totalParts; }
    public CloudUploadSessionStatus getStatus() { return status; }
    public void setStatus(CloudUploadSessionStatus status) { this.status = status; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
