package com.orbit.cloud.service;

import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.CreateDocumentRequest;
import com.orbit.cloud.dto.SaveTextContentRequest;
import com.orbit.cloud.dto.TextContentResponse;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.cloud.service.OoxmlTemplateGenerator.GeneratedTemplate;
import com.orbit.common.ApiException;
import com.orbit.storage.service.CloudStorageClient;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manages blank document creation and in-place text/binary content updates for Cloud Files. */
@Service
public class CloudDocumentService {

    public static final long MAX_TEXT_BYTES = 5_242_880L;

    private final CloudNodeRepository nodeRepo;
    private final CloudNodeService nodeService;
    private final CloudNodeMapper mapper;
    private final CloudQuotaService quotaService;
    private final CloudStorageClient storageClient;
    private final OoxmlTemplateGenerator templateGenerator;

    public CloudDocumentService(
        CloudNodeRepository nodeRepo,
        CloudNodeService nodeService,
        CloudNodeMapper mapper,
        CloudQuotaService quotaService,
        CloudStorageClient storageClient,
        OoxmlTemplateGenerator templateGenerator
    ) {
        this.nodeRepo = nodeRepo;
        this.nodeService = nodeService;
        this.mapper = mapper;
        this.quotaService = quotaService;
        this.storageClient = storageClient;
        this.templateGenerator = templateGenerator;
    }

    @Transactional
    public CloudNodeResponse createDocument(CloudScope scope, UUID userId, CreateDocumentRequest req) {
        if (req.parentId() != null) nodeService.requireWritable(scope, req.parentId());
        String trimmed = CloudNameValidator.validateAndTrim(req.name());
        String finalName = CloudNameValidator.validateAndTrim(
            templateGenerator.ensureExtension(trimmed, req.templateType())
        );
        int depth = resolveParentDepth(scope, req.parentId());
        GeneratedTemplate generated = templateGenerator.generate(req.templateType());
        long size = generated.bytes().length;

        quotaService.reserve(scope, size);
        UUID nodeId = UUID.randomUUID();
        String storageKey = CloudUploadHelper.buildStorageKey(scope, nodeId);
        boolean uploaded = false;
        boolean committed = false;
        try {
            String etag = storageClient.putBytes(storageKey, generated.bytes(), generated.mimeType());
            uploaded = true;
            quotaService.commitUpload(scope, size, size);
            committed = true;

            CloudNodeEntity node = CloudUploadHelper.buildPendingFileNode(
                scope, userId, nodeId, req.parentId(), finalName, generated.mimeType(), size, storageKey, depth
            );
            node.setEtag(etag);
            node.setUploadStatus(CloudUploadStatus.READY);
            CloudNodeEntity saved = nodeRepo.saveAndFlush(node);
            nodeService.publishCatalog(scope, "CREATE", saved.getId(), null);
            return mapper.toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            rollbackCreate(scope, storageKey, size, uploaded, committed);
            throw ApiException.conflict("DUPLICATE_NAME", "An item with that name already exists in this folder.");
        } catch (RuntimeException ex) {
            rollbackCreate(scope, storageKey, size, uploaded, committed);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public TextContentResponse getTextContent(CloudScope scope, UUID nodeId) {
        CloudNodeEntity node = requireActiveFile(scope, nodeId);
        if (node.getSizeBytes() > MAX_TEXT_BYTES) {
            throw textTooLarge();
        }
        byte[] bytes = storageClient.getBytes(node.getStorageKey(), MAX_TEXT_BYTES);
        String content = new String(bytes, StandardCharsets.UTF_8);
        return new TextContentResponse(
            node.getId(),
            node.getName(),
            node.getMimeType(),
            content,
            node.getSizeBytes(),
            node.getUpdatedAt(),
            node.getEtag()
        );
    }

    @Transactional
    public CloudNodeResponse saveTextContent(
        CloudScope scope, UUID userId, UUID nodeId, SaveTextContentRequest req
    ) {
        nodeService.requireWritable(scope, nodeId);
        CloudNodeEntity node = requireActiveFile(scope, nodeId);
        byte[] bytes = req.content().getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_TEXT_BYTES) {
            throw textTooLarge();
        }
        if (req.expectedUpdatedAt() != null && node.getUpdatedAt() != null) {
            Instant current = node.getUpdatedAt().truncatedTo(ChronoUnit.MILLIS);
            Instant expected = req.expectedUpdatedAt().truncatedTo(ChronoUnit.MILLIS);
            if (!current.equals(expected)) {
                throw ApiException.conflict(
                    "CONFLICT_MODIFIED",
                    "This file was modified elsewhere. Reload before saving."
                );
            }
        }
        return mapper.toResponse(replaceNodeBytes(scope, node, userId, bytes));
    }

    @Transactional
    public CloudNodeEntity replaceNodeBytes(CloudScope scope, UUID nodeId, UUID userId, byte[] bytes) {
        nodeService.requireWritable(scope, nodeId);
        CloudNodeEntity node = requireActiveFile(scope, nodeId);
        return replaceNodeBytes(scope, node, userId, bytes);
    }

    private CloudNodeEntity replaceNodeBytes(CloudScope scope, CloudNodeEntity node, UUID userId, byte[] bytes) {
        String oldKey = node.getStorageKey();
        long oldSize = node.getSizeBytes();
        long newSize = bytes.length;
        long delta = newSize - oldSize;

        String newKey = CloudUploadHelper.buildStorageKey(scope, node.getId());
        String etag = storageClient.putBytes(newKey, bytes, node.getMimeType());
        try {
            quotaService.adjustUsedBytes(scope, delta);
        } catch (RuntimeException ex) {
            storageClient.deleteObject(newKey);
            throw ex;
        }
        node.setStorageKey(newKey);
        node.setSizeBytes(newSize);
        node.setEtag(etag);
        node.setUpdatedBy(userId);
        node.setUpdatedAt(Instant.now());
        CloudNodeEntity saved = nodeRepo.saveAndFlush(node);
        if (oldKey != null && !oldKey.equals(newKey)) {
            storageClient.deleteObject(oldKey);
        }
        nodeService.broadcastCheckpoint(scope, saved.getId(), userId, saved.getUpdatedAt());
        return saved;
    }

    private CloudNodeEntity requireActiveFile(CloudScope scope, UUID nodeId) {
        CloudNodeEntity node = nodeService.requireActiveNode(scope, nodeId);
        if (node.getNodeType() != CloudNodeType.FILE || node.getStorageKey() == null) {
            throw ApiException.badRequest("NOT_A_FILE", "Target node must be a file.");
        }
        return node;
    }

    private int resolveParentDepth(CloudScope scope, UUID parentId) {
        if (parentId == null) return 0;
        int depth = nodeService.requireActiveFolder(scope, parentId).getDepth() + 1;
        if (depth > CloudNodeService.MAX_DEPTH) {
            throw ApiException.badRequest("MAX_DEPTH_EXCEEDED", "Maximum folder depth of 20 exceeded.");
        }
        return depth;
    }

    private void rollbackCreate(CloudScope scope, String key, long size, boolean uploaded, boolean committed) {
        if (!committed) quotaService.releaseReservation(scope, size);
        else quotaService.releaseUsedBytes(scope, size);
        if (uploaded) storageClient.deleteObject(key);
    }

    private static ApiException textTooLarge() {
        return new ApiException(
            HttpStatus.PAYLOAD_TOO_LARGE,
            "FILE_TOO_LARGE",
            "Text editor supports files up to 5 MB."
        );
    }
}
