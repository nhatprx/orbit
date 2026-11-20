package com.orbit.cloud.service;

import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudUploadSessionEntity;
import com.orbit.cloud.entity.CloudUploadSessionStatus;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.entity.CloudUploadStrategy;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.cloud.repository.CloudUploadSessionRepository;
import com.orbit.common.ApiException;
import com.orbit.storage.service.CloudKeyFactory;
import com.orbit.storage.service.CloudStorageClient;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Shared upload session helpers, builders, and stale-session expiration logic. */
@Component
public class CloudUploadHelper {

    private final CloudNodeRepository nodeRepo;
    private final CloudUploadSessionRepository sessionRepo;
    private final CloudQuotaService quotaService;
    private final CloudStorageClient storageClient;

    public CloudUploadHelper(
        CloudNodeRepository nodeRepo,
        CloudUploadSessionRepository sessionRepo,
        CloudQuotaService quotaService,
        CloudStorageClient storageClient
    ) {
        this.nodeRepo = nodeRepo;
        this.sessionRepo = sessionRepo;
        this.quotaService = quotaService;
        this.storageClient = storageClient;
    }

    public CloudUploadSessionEntity requireOpenSession(CloudScope scope, UUID sessionId) {
        CloudUploadSessionEntity session = sessionRepo
            .findByIdAndScopeTypeAndScopeId(sessionId, scope.type(), scope.scopeId())
            .orElseThrow(() -> ApiException.notFound("SESSION_NOT_FOUND", "Upload session not found."));
        if (session.getStatus() != CloudUploadSessionStatus.OPEN) {
            throw ApiException.conflict("SESSION_CLOSED", "Upload session is no longer open.");
        }
        if (session.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.gone("SESSION_EXPIRED", "Upload session has expired.");
        }
        return session;
    }

    public void cleanupStorage(CloudUploadSessionEntity session) {
        if (session.getStrategy() == CloudUploadStrategy.MULTIPART && session.getS3UploadId() != null) {
            storageClient.abortMultipartUpload(session.getStorageKey(), session.getS3UploadId());
        } else {
            storageClient.deleteObject(session.getStorageKey());
        }
    }

    public void failSessionAndNode(CloudUploadSessionEntity session, CloudNodeEntity node, boolean deleteObj) {
        session.setStatus(CloudUploadSessionStatus.ABORTED);
        node.setUploadStatus(CloudUploadStatus.FAILED);
        sessionRepo.save(session);
        nodeRepo.save(node);
        if (deleteObj) {
            storageClient.deleteObject(session.getStorageKey());
        }
    }

    public void clearStalePendingDuplicate(CloudScope scope, UUID parentId, String nameNormalized) {
        List<CloudNodeEntity> pending = nodeRepo.findPendingSiblings(
            scope.type(), scope.scopeId(), parentId, nameNormalized
        );
        if (pending.isEmpty()) {
            return;
        }
        for (CloudNodeEntity staleNode : pending) {
            staleNode.setUploadStatus(CloudUploadStatus.FAILED);
            List<CloudUploadSessionEntity> sessions = sessionRepo.findByNodeIdAndStatus(
                staleNode.getId(), CloudUploadSessionStatus.OPEN
            );
            for (CloudUploadSessionEntity session : sessions) {
                quotaService.releaseReservation(scope, session.getExpectedSizeBytes());
                try {
                    cleanupStorage(session);
                } catch (RuntimeException ignored) {
                    // Best-effort storage cleanup; sweeper handles stragglers.
                }
                session.setStatus(CloudUploadSessionStatus.ABORTED);
            }
            if (!sessions.isEmpty()) {
                sessionRepo.saveAll(sessions);
            }
        }
        nodeRepo.saveAllAndFlush(pending);
    }

    @Transactional
    public int expireStaleSessions() {
        List<CloudUploadSessionEntity> stale = sessionRepo
            .findTop100ByStatusAndExpiresAtLessThanEqualOrderByExpiresAtAsc(
                CloudUploadSessionStatus.OPEN, Instant.now()
            );
        for (CloudUploadSessionEntity session : stale) {
            CloudScope scope = new CloudScope(session.getScopeType(), session.getScopeId(), null, null);
            quotaService.releaseReservation(scope, session.getExpectedSizeBytes());
            cleanupStorage(session);
            session.setStatus(CloudUploadSessionStatus.EXPIRED);
            nodeRepo.findById(session.getNodeId()).ifPresent(node -> {
                if (node.getUploadStatus() == CloudUploadStatus.PENDING) {
                    node.setUploadStatus(CloudUploadStatus.FAILED);
                    nodeRepo.save(node);
                }
            });
        }
        sessionRepo.saveAll(stale);
        return stale.size();
    }

    public static CloudUploadSessionEntity buildSession(
        CloudScope scope, UUID actorId, UUID nodeId, String storageKey, CloudUploadStrategy strategy,
        String s3UploadId, long expectedSize, long partSize, int totalParts, Instant expiresAt
    ) {
        CloudUploadSessionEntity s = new CloudUploadSessionEntity();
        s.setNodeId(nodeId);
        s.setScopeType(scope.type());
        s.setScopeId(scope.scopeId());
        s.setStorageKey(storageKey);
        s.setStrategy(strategy);
        s.setS3UploadId(s3UploadId);
        s.setExpectedSizeBytes(expectedSize);
        s.setPartSizeBytes(partSize);
        s.setTotalParts(totalParts);
        s.setStatus(CloudUploadSessionStatus.OPEN);
        s.setCreatedBy(actorId);
        s.setExpiresAt(expiresAt);
        return s;
    }

    public static CloudNodeEntity buildPendingFileNode(
        CloudScope scope, UUID actorId, UUID nodeId, UUID parentId,
        String name, String mimeType, long sizeBytes, String storageKey, int depth
    ) {
        CloudNodeEntity n = new CloudNodeEntity();
        n.setId(nodeId);
        n.setScopeType(scope.type());
        n.setScopeId(scope.scopeId());
        n.setWorkspaceId(scope.workspaceId());
        n.setProjectId(scope.projectId());
        n.setParentId(parentId);
        n.setNodeType(CloudNodeType.FILE);
        n.setName(name);
        n.setNameNormalized(CloudNameValidator.normalize(name));
        n.setMimeType(mimeType);
        n.setSizeBytes(sizeBytes);
        n.setStorageKey(storageKey);
        n.setUploadStatus(CloudUploadStatus.PENDING);
        n.setDepth(depth);
        n.setCreatedBy(actorId);
        n.setUpdatedBy(actorId);
        return n;
    }

    public static String buildStorageKey(CloudScope scope, UUID nodeId) {
        return switch (scope.type()) {
            case USER -> CloudKeyFactory.userKey(scope.scopeId(), nodeId);
            case WORKSPACE -> CloudKeyFactory.workspaceKey(scope.scopeId(), nodeId);
            case PROJECT -> CloudKeyFactory.projectKey(scope.scopeId(), nodeId);
        };
    }

    public static String normalizeMimeType(String mimeType) {
        return (mimeType == null || mimeType.isBlank()) ? "application/octet-stream" : mimeType.trim();
    }
}
