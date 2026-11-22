package com.orbit.cloud.service;

import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.common.ApiException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** Pure validation, quota sizing, collision resolution, and mutation planning for Cloud Files moves. */
final class CloudMovePlanner {

    private CloudMovePlanner() {}

    static void validateCyclesAndDepth(
        List<CloudNodeEntity> topLevel,
        Map<UUID, List<CloudNodeEntity>> subtreesByFolder,
        Map<UUID, List<UUID>> subtreeIdsByFolder,
        boolean sameScope,
        UUID targetParentId,
        int targetDepth
    ) {
        for (CloudNodeEntity node : topLevel) {
            if (sameScope && targetParentId != null) {
                if (targetParentId.equals(node.getId())) {
                    throw ApiException.badRequest("FOLDER_CYCLE", "Cannot move a folder into itself.");
                }
                if (node.getNodeType() == CloudNodeType.FOLDER
                    && subtreeIdsByFolder.getOrDefault(node.getId(), List.of()).contains(targetParentId)) {
                    throw ApiException.badRequest("FOLDER_CYCLE", "Cannot move a folder into its own descendant.");
                }
            }
            if (node.getNodeType() == CloudNodeType.FOLDER) {
                int delta = targetDepth - node.getDepth();
                for (CloudNodeEntity item : subtreesByFolder.getOrDefault(node.getId(), List.of())) {
                    if (item.getDepth() + delta > CloudNodeService.MAX_DEPTH) {
                        throw ApiException.badRequest("MAX_DEPTH_EXCEEDED", "Maximum folder depth of 20 exceeded.");
                    }
                }
            } else if (targetDepth > CloudNodeService.MAX_DEPTH) {
                throw ApiException.badRequest("MAX_DEPTH_EXCEEDED", "Maximum folder depth of 20 exceeded.");
            }
        }
    }

    static long computeMovedReadyBytes(
        List<CloudNodeEntity> topLevel, Map<UUID, List<CloudNodeEntity>> subtreesByFolder
    ) {
        long total = 0L;
        for (CloudNodeEntity node : topLevel) {
            if (node.getNodeType() == CloudNodeType.FILE && node.getUploadStatus() == CloudUploadStatus.READY) {
                total += node.getSizeBytes();
            } else if (node.getNodeType() == CloudNodeType.FOLDER) {
                for (CloudNodeEntity item : subtreesByFolder.getOrDefault(node.getId(), List.of())) {
                    if (item.getNodeType() == CloudNodeType.FILE && item.getUploadStatus() == CloudUploadStatus.READY) {
                        total += item.getSizeBytes();
                    }
                }
            }
        }
        return total;
    }

    static List<CloudNodeEntity> applyMoves(
        List<CloudNodeEntity> topLevel,
        Map<UUID, List<CloudNodeEntity>> subtreesByFolder,
        CloudScope targetScope,
        UUID targetParentId,
        int targetDepth,
        boolean sameScope,
        UUID actorId,
        Map<String, UUID> occupied
    ) {
        List<CloudNodeEntity> toSave = new ArrayList<>();
        for (CloudNodeEntity node : topLevel) {
            if (sameScope && Objects.equals(node.getParentId(), targetParentId)) {
                occupied.put(node.getNameNormalized(), node.getId());
                continue;
            }
            resolveCollisionName(node, occupied);
            int delta = targetDepth - node.getDepth();
            applyScope(node, targetScope);
            node.setParentId(targetParentId);
            node.setDepth(targetDepth);
            node.setUpdatedBy(actorId);
            toSave.add(node);

            if (node.getNodeType() == CloudNodeType.FOLDER) {
                for (CloudNodeEntity item : subtreesByFolder.getOrDefault(node.getId(), List.of())) {
                    if (item.getId().equals(node.getId())) continue;
                    applyScope(item, targetScope);
                    item.setDepth(Math.max(0, item.getDepth() + delta));
                    toSave.add(item);
                }
            }
        }
        return toSave;
    }

    private static void resolveCollisionName(CloudNodeEntity node, Map<String, UUID> occupied) {
        String norm = node.getNameNormalized();
        UUID existing = occupied.get(norm);
        if (existing != null && !existing.equals(node.getId())) {
            int counter = 1;
            String candidate;
            String candNorm;
            do {
                candidate = CloudNameValidator.numberedName(node.getName(), node.getNodeType(), counter++);
                candNorm = CloudNameValidator.normalize(candidate);
            } while (occupied.containsKey(candNorm));
            node.setName(candidate);
            node.setNameNormalized(candNorm);
            norm = candNorm;
        }
        occupied.put(norm, node.getId());
    }

    private static void applyScope(CloudNodeEntity node, CloudScope scope) {
        node.setScopeType(scope.type());
        node.setScopeId(scope.scopeId());
        node.setWorkspaceId(scope.workspaceId());
        node.setProjectId(scope.projectId());
    }
}
