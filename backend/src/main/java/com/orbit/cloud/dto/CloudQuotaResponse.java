package com.orbit.cloud.dto;

import com.orbit.cloud.entity.CloudScopeType;
import java.util.UUID;

public record CloudQuotaResponse(
    CloudScopeType scopeType,
    UUID scopeId,
    long usedBytes,
    long quotaBytes,
    long reservedBytes,
    long maxFileSizeBytes,
    long multipartThresholdBytes
) {}
