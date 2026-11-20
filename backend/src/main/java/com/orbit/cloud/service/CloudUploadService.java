package com.orbit.cloud.service;

import com.orbit.cloud.config.CloudProperties;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.CompleteUploadRequest;
import com.orbit.cloud.dto.InitUploadRequest;
import com.orbit.cloud.dto.InitUploadResponse;
import com.orbit.cloud.dto.SignPartsRequest;
import com.orbit.cloud.dto.SignPartsResponse;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudUploadSessionEntity;
import com.orbit.cloud.entity.CloudUploadSessionStatus;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.entity.CloudUploadStrategy;
import com.orbit.cloud.event.CloudFileReadyEvent;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.cloud.repository.CloudUploadSessionRepository;
import com.orbit.common.ApiException;
import com.orbit.storage.service.CloudStorageClient;
import com.orbit.storage.service.CloudStorageClient.CompletedPartInput;
import com.orbit.storage.service.CloudStorageClient.HeadObjectResult;
import com.orbit.storage.service.CloudStorageClient.PresignedUploadResult;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CloudUploadService {

    private final CloudNodeRepository nodeRepo;
    private final CloudUploadSessionRepository sessionRepo;
    private final CloudNodeService nodeService;
    private final CloudNodeMapper mapper;
    private final CloudQuotaService quotaService;
    private final CloudRateLimiter rateLimiter;
    private final CloudStorageClient storageClient;
    private final CloudProperties properties;
    private final CloudUploadHelper helper;
    private final ApplicationEventPublisher eventPublisher;

    public CloudUploadService(
        CloudNodeRepository nodeRepo, CloudUploadSessionRepository sessionRepo, CloudNodeService nodeService,
        CloudNodeMapper mapper, CloudQuotaService quotaService, CloudRateLimiter rateLimiter,
        CloudStorageClient storageClient, CloudProperties properties, CloudUploadHelper helper,
        ApplicationEventPublisher eventPublisher
    ) {
        this.nodeRepo = nodeRepo;
        this.sessionRepo = sessionRepo;
        this.nodeService = nodeService;
        this.mapper = mapper;
        this.quotaService = quotaService;
        this.rateLimiter = rateLimiter;
        this.storageClient = storageClient;
        this.properties = properties;
        this.helper = helper;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public InitUploadResponse initUpload(CloudScope scope, UUID actorId, InitUploadRequest req) {
        rateLimiter.checkPresignLimit(actorId, "upload-init");
        String name = CloudNameValidator.validateAndTrim(req.name());
        if (req.sizeBytes() > properties.getMaxFileSizeBytes()) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "File exceeds maximum allowed size.");
        }
        int depth = resolveParentDepth(scope, req.parentId());
        String mimeType = CloudUploadHelper.normalizeMimeType(req.mimeType());
        quotaService.reserve(scope, req.sizeBytes());

        UUID nodeId = UUID.randomUUID();
        String storageKey = CloudUploadHelper.buildStorageKey(scope, nodeId);
        String s3UploadId = null;
        try {
            nodeRepo.saveAndFlush(CloudUploadHelper.buildPendingFileNode(
                scope, actorId, nodeId, req.parentId(), name, mimeType, req.sizeBytes(), storageKey, depth
            ));
            boolean multipart = req.sizeBytes() >= properties.getMultipartThresholdBytes();
            Duration ttl = Duration.ofMinutes(properties.getUploadSessionTtlMinutes());
            Instant expiresAt = Instant.now().plus(ttl);
            CloudUploadStrategy strategy = multipart ? CloudUploadStrategy.MULTIPART : CloudUploadStrategy.SINGLE;
            long partSize = multipart ? properties.getMultipartPartSizeBytes() : Math.max(req.sizeBytes(), 1L);
            int totalParts = multipart ? (int) Math.ceil((double) req.sizeBytes() / partSize) : 1;
            String uploadUrl = null;
            Map<String, String> uploadHeaders = Map.of();
            if (multipart) {
                s3UploadId = storageClient.createMultipartUpload(storageKey, mimeType);
            } else {
                PresignedUploadResult p = storageClient.presignPutObject(storageKey, mimeType, req.sizeBytes(), ttl);
                uploadUrl = p.url();
                uploadHeaders = p.headers();
                expiresAt = p.expiresAt();
            }
            CloudUploadSessionEntity session = sessionRepo.save(CloudUploadHelper.buildSession(
                scope, actorId, nodeId, storageKey, strategy, s3UploadId, req.sizeBytes(), partSize, totalParts, expiresAt
            ));
            return new InitUploadResponse(
                session.getId(), nodeId, strategy, uploadUrl, uploadHeaders, partSize, totalParts, expiresAt
            );
        } catch (DataIntegrityViolationException ex) {
            quotaService.releaseReservation(scope, req.sizeBytes());
            throw ApiException.conflict("DUPLICATE_NAME", "An item with that name already exists in this folder.");
        } catch (RuntimeException ex) {
            quotaService.releaseReservation(scope, req.sizeBytes());
            if (s3UploadId != null) storageClient.abortMultipartUpload(storageKey, s3UploadId);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public SignPartsResponse signParts(CloudScope scope, UUID actorId, UUID sessionId, SignPartsRequest req) {
        rateLimiter.checkPresignLimit(actorId, "upload-sign");
        CloudUploadSessionEntity session = helper.requireOpenSession(scope, sessionId);
        if (session.getStrategy() != CloudUploadStrategy.MULTIPART) {
            throw ApiException.badRequest("NOT_MULTIPART", "Upload session does not use multipart strategy.");
        }
        Duration ttl = Duration.ofMinutes(15);
        List<SignPartsResponse.SignedPart> signed = req.partNumbers().stream().distinct().sorted().map(num -> {
            if (num == null || num < 1 || num > session.getTotalParts()) {
                throw ApiException.badRequest("INVALID_PART_NUMBER", "Part number out of range.");
            }
            String url = storageClient.presignUploadPart(session.getStorageKey(), session.getS3UploadId(), num, ttl);
            return new SignPartsResponse.SignedPart(num, url);
        }).toList();
        return new SignPartsResponse(signed, Instant.now().plus(ttl));
    }

    @Transactional
    public CloudNodeResponse completeUpload(CloudScope scope, UUID actorId, UUID sessionId, CompleteUploadRequest req) {
        CloudUploadSessionEntity session = helper.requireOpenSession(scope, sessionId);
        CloudNodeEntity node = nodeRepo.findByIdAndScopeTypeAndScopeId(session.getNodeId(), scope.type(), scope.scopeId())
            .orElseThrow(() -> ApiException.notFound("NODE_NOT_FOUND", "Upload node not found."));
        String etag = completeMultipartIfNeeded(session, req);
        HeadObjectResult head = storageClient.headObject(session.getStorageKey())
            .orElseThrow(() -> ApiException.badRequest("UPLOAD_OBJECT_MISSING", "Uploaded object was not found in storage."));
        long actualSize = head.contentLength();
        if (actualSize > properties.getMaxFileSizeBytes()) {
            helper.failSessionAndNode(session, node, true);
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Uploaded file exceeds maximum allowed size.");
        }
        try {
            quotaService.commitUpload(scope, session.getExpectedSizeBytes(), actualSize);
        } catch (ApiException ex) {
            helper.failSessionAndNode(session, node, true);
            throw ex;
        }
        node.setSizeBytes(actualSize);
        node.setEtag(etag != null ? etag : head.eTag());
        if (req != null && req.checksumSha256() != null && !req.checksumSha256().isBlank()) {
            node.setChecksumSha256(req.checksumSha256().trim());
        }
        node.setUploadStatus(CloudUploadStatus.READY);
        node.setUpdatedBy(actorId);
        session.setStatus(CloudUploadSessionStatus.COMPLETED);
        sessionRepo.save(session);
        CloudNodeEntity saved = nodeRepo.save(node);
        eventPublisher.publishEvent(new CloudFileReadyEvent(saved.getId()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public void abortUpload(CloudScope scope, UUID sessionId) {
        CloudUploadSessionEntity session = helper.requireOpenSession(scope, sessionId);
        quotaService.releaseReservation(scope, session.getExpectedSizeBytes());
        helper.cleanupStorage(session);
        session.setStatus(CloudUploadSessionStatus.ABORTED);
        sessionRepo.save(session);
        nodeRepo.findById(session.getNodeId()).ifPresent(n -> { n.setUploadStatus(CloudUploadStatus.FAILED); nodeRepo.save(n); });
    }

    public int expireStaleSessions() { return helper.expireStaleSessions(); }

    private int resolveParentDepth(CloudScope scope, UUID parentId) {
        if (parentId == null) return 0;
        int depth = nodeService.requireActiveFolder(scope, parentId).getDepth() + 1;
        if (depth > CloudNodeService.MAX_DEPTH) throw ApiException.badRequest("MAX_DEPTH_EXCEEDED", "Maximum folder depth of 20 exceeded.");
        return depth;
    }

    private String completeMultipartIfNeeded(CloudUploadSessionEntity session, CompleteUploadRequest req) {
        if (session.getStrategy() != CloudUploadStrategy.MULTIPART) return null;
        if (req == null || req.parts() == null || req.parts().isEmpty()) {
            throw ApiException.badRequest("PARTS_REQUIRED", "Completed parts are required for multipart upload.");
        }
        List<CompletedPartInput> parts = req.parts().stream()
            .sorted(Comparator.comparingInt(CompleteUploadRequest.CompletedPartDto::partNumber))
            .map(p -> new CompletedPartInput(p.partNumber(), p.eTag())).toList();
        return storageClient.completeMultipartUpload(session.getStorageKey(), session.getS3UploadId(), parts);
    }
}
