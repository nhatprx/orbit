package com.orbit.cloud.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class CloudStorageQuotaId implements Serializable {

    private CloudScopeType scopeType;
    private UUID scopeId;

    public CloudStorageQuotaId() {}

    public CloudStorageQuotaId(CloudScopeType scopeType, UUID scopeId) {
        this.scopeType = scopeType;
        this.scopeId = scopeId;
    }

    public CloudScopeType getScopeType() { return scopeType; }
    public UUID getScopeId() { return scopeId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CloudStorageQuotaId that)) return false;
        return scopeType == that.scopeType && Objects.equals(scopeId, that.scopeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(scopeType, scopeId);
    }
}
