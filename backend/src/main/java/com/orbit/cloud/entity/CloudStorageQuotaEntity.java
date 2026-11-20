package com.orbit.cloud.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cloud_storage_quotas")
@IdClass(CloudStorageQuotaId.class)
public class CloudStorageQuotaEntity {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", nullable = false, length = 16)
    private CloudScopeType scopeType;

    @Id
    @Column(name = "scope_id", nullable = false)
    private UUID scopeId;

    @Column(name = "used_bytes", nullable = false)
    private long usedBytes;

    @Column(name = "quota_bytes", nullable = false)
    private long quotaBytes;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public CloudStorageQuotaEntity() {}

    public CloudStorageQuotaEntity(CloudScopeType scopeType, UUID scopeId, long quotaBytes) {
        this.scopeType = scopeType;
        this.scopeId = scopeId;
        this.quotaBytes = quotaBytes;
        this.usedBytes = 0L;
        this.updatedAt = Instant.now();
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public CloudScopeType getScopeType() { return scopeType; }
    public UUID getScopeId() { return scopeId; }
    public long getUsedBytes() { return usedBytes; }
    public void setUsedBytes(long usedBytes) { this.usedBytes = usedBytes; }
    public long getQuotaBytes() { return quotaBytes; }
    public void setQuotaBytes(long quotaBytes) { this.quotaBytes = quotaBytes; }
    public Instant getUpdatedAt() { return updatedAt; }
}
