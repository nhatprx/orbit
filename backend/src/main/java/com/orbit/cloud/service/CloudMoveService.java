package com.orbit.cloud.service;

import com.orbit.cloud.dto.MoveCloudNodesRequest;
import com.orbit.cloud.dto.MoveCloudNodesResponse;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.common.ApiException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Atomic batch and cross-scope move service with Finder-style collision auto-rename and quota transfer. */
@Service
public class CloudMoveService {

    public static final int MAX_BATCH_SIZE = 100;

    private final CloudAccessGuard guard;
    private final CloudNodeRepository nodeRepo;
    private final CloudNodeService nodeService;
    private final CloudQuotaService quotaService;
    private final CloudNodeMapper mapper;

    public CloudMoveService(
        CloudAccessGuard guard,
        CloudNodeRepository nodeRepo,
        CloudNodeService nodeService,
        CloudQuotaService quotaService,
        CloudNodeMapper mapper
    ) {
        this.guard = guard;
        this.nodeRepo = nodeRepo;
        this.nodeService = nodeService;
        this.quotaService = quotaService;
        this.mapper = mapper;
    }

    @Transactional
    public MoveCloudNodesResponse moveNodes(UUID actorId, MoveCloudNodesRequest req) {
        Set<UUID> uniqueIds = validateAndDeduplicateIds(req.nodeIds());
        CloudScope sourceScope = guard.requireWriteScope(
            actorId, req.sourceScopeType(), req.sourceWorkspaceId(), req.sourceProjectId()
        );
        CloudScope targetScope = guard.requireWriteScope(
            actorId, req.targetScopeType(), req.targetWorkspaceId(), req.targetProjectId()
        );
        boolean sameScope = sourceScope.equals(targetScope);

        int targetDepth = resolveTargetDepth(targetScope, req.targetParentId());
        if (req.targetParentId() != null) nodeService.requireWritable(targetScope, req.targetParentId());
        List<CloudNodeEntity> requested = loadActiveNodesInOrder(sourceScope, uniqueIds);
        for (CloudNodeEntity node : requested) nodeService.requireWritable(sourceScope, node.getId());

        Map<UUID, List<UUID>> subtreeIdsByFolder = new HashMap<>();
        Set<UUID> strictDescendants = new HashSet<>();
        for (CloudNodeEntity node : requested) {
            if (node.getNodeType() == CloudNodeType.FOLDER) {
                List<UUID> ids = nodeRepo.findSubtreeIds(node.getId(), sourceScope.type().name(), sourceScope.scopeId());
                subtreeIdsByFolder.put(node.getId(), ids);
                for (UUID id : ids) {
                    if (!id.equals(node.getId())) strictDescendants.add(id);
                }
            }
        }
        List<CloudNodeEntity> topLevel = requested.stream()
            .filter(n -> !strictDescendants.contains(n.getId()))
            .toList();

        Map<UUID, List<CloudNodeEntity>> subtreesByFolder = loadSubtrees(topLevel, subtreeIdsByFolder);
        CloudMovePlanner.validateCyclesAndDepth(
            topLevel, subtreesByFolder, subtreeIdsByFolder, sameScope, req.targetParentId(), targetDepth
        );

        if (!sameScope) {
            long movedBytes = CloudMovePlanner.computeMovedReadyBytes(topLevel, subtreesByFolder);
            quotaService.transferUsedBytes(sourceScope, targetScope, movedBytes);
        }

        Map<String, UUID> occupied = loadOccupiedSiblingNames(targetScope, req.targetParentId());
        List<CloudNodeEntity> toSave = CloudMovePlanner.applyMoves(
            topLevel, subtreesByFolder, targetScope, req.targetParentId(), targetDepth, sameScope, actorId, occupied
        );
        if (!toSave.isEmpty()) {
            nodeRepo.saveAll(toSave);
            nodeRepo.flush();
            for (CloudNodeEntity node : topLevel) nodeService.publishCatalog(targetScope, "MOVE", node.getId(), null);
        }
        return new MoveCloudNodesResponse(mapper.toResponses(topLevel));
    }

    private Set<UUID> validateAndDeduplicateIds(List<UUID> rawIds) {
        if (rawIds == null || rawIds.isEmpty()) {
            throw ApiException.badRequest("INVALID_MOVE_REQUEST", "At least one nodeId is required.");
        }
        Set<UUID> unique = new LinkedHashSet<>();
        for (UUID id : rawIds) {
            if (id == null) {
                throw ApiException.badRequest("INVALID_MOVE_REQUEST", "nodeIds cannot contain null.");
            }
            unique.add(id);
        }
        if (unique.size() > MAX_BATCH_SIZE) {
            throw ApiException.badRequest("TOO_MANY_NODES", "At most 100 nodes can be moved in one request.");
        }
        return unique;
    }

    private int resolveTargetDepth(CloudScope targetScope, UUID targetParentId) {
        if (targetParentId == null) return 0;
        return nodeService.requireActiveFolder(targetScope, targetParentId).getDepth() + 1;
    }

    private List<CloudNodeEntity> loadActiveNodesInOrder(CloudScope sourceScope, Set<UUID> uniqueIds) {
        Map<UUID, CloudNodeEntity> found = nodeRepo
            .findByIdInAndScopeTypeAndScopeId(uniqueIds, sourceScope.type(), sourceScope.scopeId())
            .stream()
            .collect(Collectors.toMap(CloudNodeEntity::getId, Function.identity()));
        List<CloudNodeEntity> ordered = new ArrayList<>(uniqueIds.size());
        for (UUID id : uniqueIds) {
            CloudNodeEntity node = found.get(id);
            if (node == null || node.getDeletedAt() != null || node.getUploadStatus() != CloudUploadStatus.READY) {
                throw ApiException.notFound("NODE_NOT_FOUND", "Node not found.");
            }
            ordered.add(node);
        }
        return ordered;
    }

    private Map<UUID, List<CloudNodeEntity>> loadSubtrees(
        List<CloudNodeEntity> topLevel, Map<UUID, List<UUID>> subtreeIdsByFolder
    ) {
        Set<UUID> allIds = new HashSet<>();
        for (CloudNodeEntity node : topLevel) {
            if (node.getNodeType() == CloudNodeType.FOLDER) {
                allIds.addAll(subtreeIdsByFolder.getOrDefault(node.getId(), List.of()));
            }
        }
        if (allIds.isEmpty()) return Map.of();
        Map<UUID, CloudNodeEntity> entitiesById = nodeRepo.findAllById(allIds).stream()
            .collect(Collectors.toMap(CloudNodeEntity::getId, Function.identity()));
        Map<UUID, List<CloudNodeEntity>> result = new HashMap<>();
        for (CloudNodeEntity node : topLevel) {
            if (node.getNodeType() != CloudNodeType.FOLDER) continue;
            List<CloudNodeEntity> list = new ArrayList<>();
            for (UUID id : subtreeIdsByFolder.getOrDefault(node.getId(), List.of())) {
                CloudNodeEntity item = entitiesById.get(id);
                if (item != null) list.add(item);
            }
            result.put(node.getId(), list);
        }
        return result;
    }

    private Map<String, UUID> loadOccupiedSiblingNames(CloudScope targetScope, UUID targetParentId) {
        Map<String, UUID> occupied = new HashMap<>();
        for (CloudNodeEntity sibling : nodeRepo.findActiveSiblings(targetScope.type(), targetScope.scopeId(), targetParentId)) {
            occupied.put(sibling.getNameNormalized(), sibling.getId());
        }
        return occupied;
    }
}
