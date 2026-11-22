package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.CreateDocumentRequest;
import com.orbit.cloud.dto.DocumentTemplateType;
import com.orbit.cloud.dto.SaveTextContentRequest;
import com.orbit.cloud.dto.TextContentResponse;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.cloud.service.CloudDocumentService;
import com.orbit.cloud.service.CloudNodeMapper;
import com.orbit.cloud.service.CloudNodeService;
import com.orbit.cloud.service.CloudQuotaService;
import com.orbit.cloud.service.CloudScope;
import com.orbit.cloud.service.OoxmlTemplateGenerator;
import com.orbit.common.ApiException;
import com.orbit.storage.service.CloudStorageClient;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class CloudDocumentServiceTest {

    private CloudNodeRepository nodeRepo;
    private CloudNodeService nodeService;
    private CloudNodeMapper mapper;
    private CloudQuotaService quotaService;
    private CloudStorageClient storageClient;
    private CloudDocumentService service;

    @BeforeEach
    void setUp() {
        nodeRepo = mock(CloudNodeRepository.class);
        nodeService = mock(CloudNodeService.class);
        mapper = mock(CloudNodeMapper.class);
        quotaService = mock(CloudQuotaService.class);
        storageClient = mock(CloudStorageClient.class);
        service = new CloudDocumentService(
            nodeRepo, nodeService, mapper, quotaService, storageClient, new OoxmlTemplateGenerator()
        );
        when(nodeRepo.saveAndFlush(any(CloudNodeEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mapper.toResponse(any(CloudNodeEntity.class))).thenAnswer(inv -> {
            CloudNodeEntity n = inv.getArgument(0);
            return new CloudNodeResponse(
                n.getId(), n.getScopeType(), n.getScopeId(), n.getParentId(), n.getNodeType(),
                n.getName(), n.getMimeType(), n.getSizeBytes(), n.isStarred(), n.getDepth(),
                n.getCreatedBy(), "Tester", n.getDeletedAt(), n.getPurgeAfter(), n.getCreatedAt(), n.getUpdatedAt(), "/"
            );
        });
    }

    @Test
    void createDocumentAppendsExtensionUploadsAndCommitsQuota() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        when(storageClient.putBytes(anyString(), any(), anyString())).thenReturn("\"etag-doc\"");

        CloudNodeResponse res = service.createDocument(
            scope, userId, new CreateDocumentRequest(null, "Design Spec", DocumentTemplateType.DOCX)
        );
        assertEquals("Design Spec.docx", res.name());
        assertEquals("application/vnd.openxmlformats-officedocument.wordprocessingml.document", res.mimeType());
        verify(quotaService).reserve(eq(scope), anyLong());
        verify(quotaService).commitUpload(eq(scope), anyLong(), anyLong());
        verify(storageClient).putBytes(anyString(), any(), eq(res.mimeType()));
    }

    @Test
    void getTextContentReadsUtf8AndEnforces5MbLimit() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        CloudNodeEntity node = sampleFile(scope, userId, "notes.md", 12L, Instant.now());
        when(nodeService.requireActiveNode(scope, node.getId())).thenReturn(node);
        when(storageClient.getBytes(node.getStorageKey(), CloudDocumentService.MAX_TEXT_BYTES))
            .thenReturn("# Hello".getBytes(StandardCharsets.UTF_8));

        TextContentResponse res = service.getTextContent(scope, node.getId());
        assertEquals("# Hello", res.content());
        assertEquals("notes.md", res.name());

        node.setSizeBytes(CloudDocumentService.MAX_TEXT_BYTES + 1L);
        ApiException tooBig = assertThrows(ApiException.class, () -> service.getTextContent(scope, node.getId()));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, tooBig.getStatus());
    }

    @Test
    void saveTextContentUpdatesInPlaceAdjustsQuotaAndHandlesLockConflict() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        Instant initialUpdated = Instant.parse("2026-06-01T10:00:00Z");
        CloudNodeEntity node = sampleFile(scope, userId, "readme.txt", 5L, initialUpdated);
        String oldKey = node.getStorageKey();
        when(nodeService.requireActiveNode(scope, node.getId())).thenReturn(node);
        when(storageClient.putBytes(anyString(), any(), anyString())).thenReturn("\"etag-2\"");

        ApiException conflict = assertThrows(
            ApiException.class,
            () -> service.saveTextContent(scope, userId, node.getId(), new SaveTextContentRequest("updated", initialUpdated.minusSeconds(5)))
        );
        assertEquals(HttpStatus.CONFLICT, conflict.getStatus());

        CloudNodeResponse saved = service.saveTextContent(
            scope, userId, node.getId(), new SaveTextContentRequest("hello world!", initialUpdated)
        );
        assertEquals(12L, saved.sizeBytes());
        assertNotEquals(oldKey, node.getStorageKey());
        verify(quotaService).adjustUsedBytes(scope, 7L);
        verify(storageClient).deleteObject(oldKey);
    }

    @Test
    void saveTextContentDeletesNewObjectWhenQuotaExceededAndRejectsOver5Mb() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        CloudNodeEntity node = sampleFile(scope, userId, "big.txt", 10L, Instant.now());
        when(nodeService.requireActiveNode(scope, node.getId())).thenReturn(node);
        when(storageClient.putBytes(anyString(), any(), anyString())).thenReturn("\"etag-3\"");
        doThrow(ApiException.badRequest("QUOTA_EXCEEDED", "Quota exceeded"))
            .when(quotaService).adjustUsedBytes(eq(scope), anyLong());

        ApiException quotaEx = assertThrows(
            ApiException.class,
            () -> service.saveTextContent(scope, userId, node.getId(), new SaveTextContentRequest("123456789012345", null))
        );
        assertEquals(HttpStatus.BAD_REQUEST, quotaEx.getStatus());
        verify(storageClient).deleteObject(anyString());

        String oversized = "a".repeat((int) CloudDocumentService.MAX_TEXT_BYTES + 1);
        ApiException sizeEx = assertThrows(
            ApiException.class,
            () -> service.saveTextContent(scope, userId, node.getId(), new SaveTextContentRequest(oversized, null))
        );
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, sizeEx.getStatus());
    }

    private static CloudNodeEntity sampleFile(CloudScope scope, UUID userId, String name, long size, Instant updatedAt) {
        CloudNodeEntity n = new CloudNodeEntity();
        n.setId(UUID.randomUUID());
        n.setScopeType(scope.type());
        n.setScopeId(scope.scopeId());
        n.setNodeType(CloudNodeType.FILE);
        n.setName(name);
        n.setNameNormalized(name.toLowerCase());
        n.setMimeType("text/plain");
        n.setSizeBytes(size);
        n.setStorageKey("cloud/users/" + userId + "/" + n.getId() + "/v1");
        n.setEtag("\"etag-1\"");
        n.setUploadStatus(CloudUploadStatus.READY);
        n.setCreatedBy(userId);
        n.setUpdatedBy(userId);
        n.setUpdatedAt(updatedAt);
        return n;
    }
}
