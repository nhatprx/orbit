package com.orbit.cloud.service;

import com.orbit.cloud.config.CloudProperties;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.EmptyTrashResponse;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.common.ApiException;
import com.orbit.storage.service.CloudStorageClient;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CloudTrashService {

    private final CloudNodeRepository nodeRepo;
    private final CloudNodeService nodeService;
    private final CloudNodeMapper mapper;
    private final CloudQuotaService quotaService;
    private final CloudStorageClient storageClient;
    private final CloudProperties properties;

    public CloudTrashService(
        CloudNodeRepository nodeRepo,
        CloudNodeService nodeService,
        CloudNodeMapper mapper,
        CloudQuotaService quotaService,
        CloudStorageClient storageClient,
        CloudProperties properties
    ) {
        this.nodeRepo = nodeRepo;
        this.nodeService = nodeService;
        this.mapper = mapper;
        this.quotaService = quotaService;
        this.storageClient = storageClient;
        this.properties = properties;
    }

    @Transactional
    public CloudNodeResponse softDelete(CloudScope scope, UUID actorId, UUID nodeId) {
        CloudNodeEntity node = nodeService.requireActiveNode(scope, nodeId);
        Instant now = Instant.now();
        node.setDeletedAt(now);
        node.setDeletedBy(actorId);
        node.setPurgeAfter(now.plus(properties.getTrashRetentionDays(), ChronoUnit.DAYS));
        node.setUpdatedBy(actorId);
        return mapper.toResponse(nodeRepo.save(node));
    }

    @Transactional
    public CloudNodeResponse restore(CloudScope scope, UUID actorId, UUID nodeId) {
        CloudNodeEntity node = nodeRepo.findByIdAndScopeTypeAndScopeId(nodeId, scope.type(), scope.scopeId())
            .orElseThrow(() -> ApiException.notFound("NODE_NOT_FOUND", "Node not found."));
        if (node.getDeletedAt() == null) {
            throw ApiException.badRequest("NOT_IN_TRASH", "Node is not in trash.");
        }
        if (node.getParentId() != null) {
            boolean parentActive = nodeRepo.findByIdAndScopeTypeAndScopeId(
                    node.getParentId(), scope.type(), scope.scopeId()
                )
                .filter(p -> p.getDeletedAt() == null && p.getUploadStatus() == CloudUploadStatus.READY)
                .isPresent();
            if (!parentActive) {
                int delta = -node.getDepth();
                if (node.getNodeType() == CloudNodeType.FOLDER && delta != 0) {
                    List<UUID> subtreeIds = nodeRepo.findSubtreeIds(
                        node.getId(), scope.type().name(), scope.scopeId()
                    );
                    List<CloudNodeEntity> subtree = nodeRepo.findAllById(subtreeIds);
                    for (CloudNodeEntity item : subtree) {
                        if (!item.getId().equals(node.getId())) {
                            item.setDepth(Math.max(0, item.getDepth() + delta));
                        }
                    }
                    nodeRepo.saveAll(subtree);
                }
                node.setParentId(null);
                node.setDepth(0);
            }
        }
        node.setDeletedAt(null);
        node.setDeletedBy(null);
        node.setPurgeAfter(null);
        node.setUpdatedBy(actorId);
        try {
            return mapper.toResponse(nodeRepo.saveAndFlush(node));
        } catch (DataIntegrityViolationException ex) {
            throw ApiException.conflict(
                "DUPLICATE_NAME",
                "Cannot restore because an active item with the same name already exists."
            );
        }
    }

    @Transactional
    public void permanentDelete(CloudScope scope, UUID nodeId) {
        CloudNodeEntity root = nodeRepo.findByIdAndScopeTypeAndScopeId(nodeId, scope.type(), scope.scopeId())
            .orElseThrow(() -> ApiException.notFound("NODE_NOT_FOUND", "Node not found."));
        purgeSubtree(scope, root);
    }

    @Transactional
    public EmptyTrashResponse emptyTrash(CloudScope scope) {
        List<CloudNodeEntity> trashed = nodeRepo.findByScopeTypeAndScopeIdAndDeletedAtIsNotNull(
            scope.type(), scope.scopeId()
        );
        if (trashed.isEmpty()) {
            return new EmptyTrashResponse(0L, 0L);
        }
        Set<UUID> allIds = new LinkedHashSet<>();
        for (CloudNodeEntity node : trashed) {
            allIds.addAll(nodeRepo.findSubtreeIds(node.getId(), scope.type().name(), scope.scopeId()));
        }
        List<CloudNodeEntity> allNodes = nodeRepo.findAllById(allIds);
        long freedBytes = sumReadyFileBytes(allNodes);
        List<String> keys = collectStorageKeys(allNodes);

        nodeRepo.deleteAll(trashed);
        nodeRepo.flush();
        quotaService.releaseUsedBytes(scope, freedBytes);
        storageClient.deleteObjects(keys);
        return new EmptyTrashResponse(allNodes.size(), freedBytes);
    }

    @Transactional
    public int purgeExpiredTrash() {
        List<CloudNodeEntity> expired = nodeRepo
            .findTop100ByDeletedAtIsNotNullAndPurgeAfterLessThanEqualOrderByPurgeAfterAsc(Instant.now());
        int count = 0;
        for (CloudNodeEntity node : expired) {
            if (!nodeRepo.existsById(node.getId())) {
                continue;
            }
            CloudScope scope = new CloudScope(
                node.getScopeType(), node.getScopeId(), node.getWorkspaceId(), node.getProjectId()
            );
            purgeSubtree(scope, node);
            count++;
        }
        return count;
    }

    private void purgeSubtree(CloudScope scope, CloudNodeEntity root) {
        List<UUID> subtreeIds = nodeRepo.findSubtreeIds(root.getId(), scope.type().name(), scope.scopeId());
        List<CloudNodeEntity> subtree = nodeRepo.findAllById(subtreeIds);
        long freedBytes = sumReadyFileBytes(subtree);
        List<String> keys = collectStorageKeys(subtree);

        nodeRepo.delete(root);
        nodeRepo.flush();
        quotaService.releaseUsedBytes(scope, freedBytes);
        storageClient.deleteObjects(keys);
    }

    private static long sumReadyFileBytes(List<CloudNodeEntity> nodes) {
        long total = 0L;
        for (CloudNodeEntity n : nodes) {
            if (n.getNodeType() == CloudNodeType.FILE && n.getUploadStatus() == CloudUploadStatus.READY) {
                total += n.getSizeBytes();
            }
        }
        return total;
    }

    private static List<String> collectStorageKeys(List<CloudNodeEntity> nodes) {
        List<String> keys = new ArrayList<>();
        for (CloudNodeEntity n : nodes) {
            if (n.getStorageKey() != null && !n.getStorageKey().isBlank()) {
                keys.add(n.getStorageKey());
            }
        }
        return keys;
    }
}
