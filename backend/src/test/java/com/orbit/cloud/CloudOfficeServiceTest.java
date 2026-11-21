package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.cloud.config.CloudProperties;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.DocBlockDto;
import com.orbit.cloud.dto.OfficeDocContentDto;
import com.orbit.cloud.dto.OfficeDocumentResponse;
import com.orbit.cloud.dto.OfficeSheetContentDto;
import com.orbit.cloud.dto.SaveOfficeDocumentRequest;
import com.orbit.cloud.dto.SheetTabDto;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.event.CloudFileReadyEvent;
import com.orbit.cloud.service.CloudDocumentService;
import com.orbit.cloud.service.CloudNodeMapper;
import com.orbit.cloud.service.CloudNodeService;
import com.orbit.cloud.service.CloudOfficeService;
import com.orbit.cloud.service.CloudScope;
import com.orbit.cloud.service.DocxOfficeCodec;
import com.orbit.cloud.service.PptxOfficeCodec;
import com.orbit.cloud.service.XlsxOfficeCodec;
import com.orbit.common.ApiException;
import com.orbit.storage.service.CloudStorageClient;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;

class CloudOfficeServiceTest {

    private CloudNodeService nodeService;
    private CloudDocumentService documentService;
    private CloudNodeMapper mapper;
    private CloudStorageClient storageClient;
    private ApplicationEventPublisher events;
    private CloudProperties props;
    private DocxOfficeCodec docxCodec;
    private CloudOfficeService officeService;

    @BeforeEach
    void setUp() {
        nodeService = mock(CloudNodeService.class);
        documentService = mock(CloudDocumentService.class);
        mapper = mock(CloudNodeMapper.class);
        storageClient = mock(CloudStorageClient.class);
        events = mock(ApplicationEventPublisher.class);
        props = new CloudProperties();
        docxCodec = new DocxOfficeCodec();
        officeService = new CloudOfficeService(
            nodeService, documentService, mapper, storageClient, props,
            docxCodec, new XlsxOfficeCodec(), new PptxOfficeCodec(), events
        );
    }

    @Test
    void readsSavesChecksOptimisticLockAndPublishesReadyEvent() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        Instant updatedAt = Instant.parse("2026-07-01T12:00:00Z");
        CloudNodeEntity node = sampleNode(userId, "spec.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 512L, updatedAt);

        OfficeDocContentDto docDto = new OfficeDocContentDto(List.of(new DocBlockDto("h1", "Spec", "left")), List.of());
        when(nodeService.requireActiveNode(scope, node.getId())).thenReturn(node);
        when(storageClient.getBytes(node.getStorageKey(), CloudOfficeService.MAX_OFFICE_BYTES))
            .thenReturn(docxCodec.write(docDto));
        when(documentService.replaceNodeBytes(eq(scope), eq(node.getId()), eq(userId), any())).thenReturn(node);
        when(mapper.toResponse(node)).thenReturn(mock(CloudNodeResponse.class));

        OfficeDocumentResponse readRes = officeService.getOfficeContent(scope, node.getId());
        assertEquals("DOCX", readRes.format());
        assertEquals(docDto, readRes.doc());
        assertNull(readRes.sheet());
        verify(storageClient).getBytes(node.getStorageKey(), CloudOfficeService.MAX_OFFICE_BYTES);

        ApiException conflict = assertThrows(ApiException.class, () -> officeService.saveOfficeContent(
            scope, userId, node.getId(), new SaveOfficeDocumentRequest("DOCX", updatedAt.minusSeconds(10), docDto, null, null)
        ));
        assertEquals(HttpStatus.CONFLICT, conflict.getStatus());

        CloudNodeResponse saved = officeService.saveOfficeContent(
            scope, userId, node.getId(), new SaveOfficeDocumentRequest("DOCX", updatedAt, docDto, null, null)
        );
        assertNotNull(saved);
        verify(events).publishEvent(new CloudFileReadyEvent(node.getId()));
    }

    @Test
    void rejectsFormatOverrideMismatchAndLegacyFormats() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        Instant updatedAt = Instant.parse("2026-07-01T12:00:00Z");
        CloudNodeEntity docxNode = sampleNode(userId, "spec.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 512L, updatedAt);
        when(nodeService.requireActiveNode(scope, docxNode.getId())).thenReturn(docxNode);

        OfficeSheetContentDto sheetDto = new OfficeSheetContentDto(List.of(new SheetTabDto("Sheet1", List.of())));
        ApiException mismatch = assertThrows(ApiException.class, () -> officeService.saveOfficeContent(
            scope, userId, docxNode.getId(), new SaveOfficeDocumentRequest("XLSX", updatedAt, null, sheetDto, null)
        ));
        assertEquals(HttpStatus.BAD_REQUEST, mismatch.getStatus());
        assertEquals("OFFICE_FORMAT_MISMATCH", mismatch.getCode());
        verify(documentService, never()).replaceNodeBytes(any(), any(), any(), any());

        CloudNodeEntity legacyDoc = sampleNode(userId, "legacy.doc", "application/msword", 512L, updatedAt);
        when(nodeService.requireActiveNode(scope, legacyDoc.getId())).thenReturn(legacyDoc);
        ApiException legacyEx = assertThrows(ApiException.class, () -> officeService.getOfficeContent(scope, legacyDoc.getId()));
        assertEquals(HttpStatus.BAD_REQUEST, legacyEx.getStatus());
        assertEquals("UNSUPPORTED_OFFICE_FORMAT", legacyEx.getCode());
    }

    @Test
    void enforces25MbOfficeSizeCapOnReadAndSave() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        Instant updatedAt = Instant.parse("2026-07-01T12:00:00Z");
        CloudNodeEntity hugeNode = sampleNode(userId, "huge.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            CloudOfficeService.MAX_OFFICE_BYTES + 1L, updatedAt);
        when(nodeService.requireActiveNode(scope, hugeNode.getId())).thenReturn(hugeNode);

        ApiException readTooBig = assertThrows(ApiException.class, () -> officeService.getOfficeContent(scope, hugeNode.getId()));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, readTooBig.getStatus());
        verify(storageClient, never()).getBytes(any(), anyLong());

        props.setMaxOfficeFileSizeBytes(128L);
        CloudNodeEntity smallNode = sampleNode(userId, "spec.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 64L, updatedAt);
        when(nodeService.requireActiveNode(scope, smallNode.getId())).thenReturn(smallNode);
        OfficeDocContentDto docDto = new OfficeDocContentDto(List.of(new DocBlockDto("p", "Hello", "left")), List.of());

        ApiException saveTooBig = assertThrows(ApiException.class, () -> officeService.saveOfficeContent(
            scope, userId, smallNode.getId(), new SaveOfficeDocumentRequest("DOCX", updatedAt, docDto, null, null)
        ));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, saveTooBig.getStatus());
        verify(documentService, never()).replaceNodeBytes(any(), any(), any(), any());
    }

    private static CloudNodeEntity sampleNode(UUID userId, String name, String mime, long size, Instant updatedAt) {
        CloudNodeEntity node = new CloudNodeEntity();
        node.setId(UUID.randomUUID());
        node.setNodeType(CloudNodeType.FILE);
        node.setName(name);
        node.setMimeType(mime);
        node.setStorageKey("cloud/users/" + userId + "/" + node.getId() + "/v1");
        node.setSizeBytes(size);
        node.setUpdatedAt(updatedAt);
        node.setUploadStatus(CloudUploadStatus.READY);
        return node;
    }
}
