package com.orbit.cloud.dto;

import com.orbit.cloud.entity.CloudScopeType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record MoveCloudNodesRequest(
    @NotEmpty(message = "At least one nodeId is required.")
    @Size(max = 100, message = "At most 100 nodes can be moved in one request.")
    List<UUID> nodeIds,
    @NotNull(message = "sourceScopeType is required.")
    CloudScopeType sourceScopeType,
    UUID sourceWorkspaceId,
    UUID sourceProjectId,
    @NotNull(message = "targetScopeType is required.")
    CloudScopeType targetScopeType,
    UUID targetWorkspaceId,
    UUID targetProjectId,
    UUID targetParentId
) {}
