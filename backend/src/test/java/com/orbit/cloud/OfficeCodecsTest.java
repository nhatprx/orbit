package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.cloud.config.CloudProperties;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.DocBlockDto;
import com.orbit.cloud.dto.DocTableDto;
import com.orbit.cloud.dto.DocumentTemplateType;
import com.orbit.cloud.dto.OfficeDocContentDto;
import com.orbit.cloud.dto.OfficeDocumentResponse;
import com.orbit.cloud.dto.OfficeSheetContentDto;
import com.orbit.cloud.dto.OfficeSlideContentDto;
import com.orbit.cloud.dto.SaveOfficeDocumentRequest;
import com.orbit.cloud.dto.SheetTabDto;
import com.orbit.cloud.dto.SlideItemDto;
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
import com.orbit.cloud.service.OoxmlTemplateGenerator;
import com.orbit.cloud.service.PptxOfficeCodec;
import com.orbit.cloud.service.XlsxOfficeCodec;
import com.orbit.common.ApiException;
import com.orbit.storage.service.CloudStorageClient;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;

class OfficeCodecsTest {

    private final DocxOfficeCodec docxCodec = new DocxOfficeCodec();
    private final XlsxOfficeCodec xlsxCodec = new XlsxOfficeCodec();
    private final PptxOfficeCodec pptxCodec = new PptxOfficeCodec();
    private final OoxmlTemplateGenerator templateGenerator = new OoxmlTemplateGenerator();

    @Test
    void docxRoundTripsBlocksAlignmentsTablesAndBlankTemplate() {
        OfficeDocContentDto input = new OfficeDocContentDto(
            List.of(
                new DocBlockDto("h1", "Orbit Architecture Overview", "center"),
                new DocBlockDto("h2", "Storage Layer", "left"),
                new DocBlockDto("h3", "Replication Strategy", "right"),
                new DocBlockDto("p", "Standard body paragraph text.", "left"),
                new DocBlockDto("quote", "Simplicity scales reliably.", "left"),
                new DocBlockDto("code", "mvn test -Dtest=OfficeCodecsTest", "left"),
                new DocBlockDto("ul", "Bullet point item", "left"),
                new DocBlockDto("ol", "Numbered step item", "left")
            ),
            List.of(new DocTableDto(List.of(
                List.of("Service", "Status"),
                List.of("Orbit Docs", "READY")
            )))
        );

        byte[] bytes = docxCodec.write(input);
        OfficeDocContentDto parsed = docxCodec.read(bytes);
        assertEquals(input.blocks(), parsed.blocks());
        assertEquals(input.tables(), parsed.tables());

        OfficeDocContentDto fromBlank = docxCodec.read(templateGenerator.generate(DocumentTemplateType.DOCX).bytes());
        assertEquals(1, fromBlank.blocks().size());
        assertThrows(ApiException.class, () -> docxCodec.read("not-a-zip".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void xlsxRoundTripsSheetsNumbersFormulasInvalidFormulaFallbackAndBlankTemplate() {
        OfficeSheetContentDto input = new OfficeSheetContentDto(List.of(
            new SheetTabDto("Budget Q1", List.of(
                List.of("Item", "Qty", "Cost", "Total"),
                List.of("Compute", "2", "150.5", "=B2*C2"),
                List.of("Storage", "1", "49", "=SUM(C2:C3)"),
                List.of("BadFormula", "", "=INVALID(((", "007")
            )),
            new SheetTabDto("Metrics", List.of(
                List.of("LatencyMs", "12")
            ))
        ));

        byte[] bytes = xlsxCodec.write(input);
        OfficeSheetContentDto parsed = xlsxCodec.read(bytes);
        assertEquals(2, parsed.sheets().size());
        assertEquals("Budget Q1", parsed.sheets().get(0).name());
        assertEquals(input.sheets().get(0).rows(), parsed.sheets().get(0).rows());
        assertEquals(input.sheets().get(1).rows(), parsed.sheets().get(1).rows());

        OfficeSheetContentDto fromBlank = xlsxCodec.read(templateGenerator.generate(DocumentTemplateType.XLSX).bytes());
        assertEquals(1, fromBlank.sheets().size());
        assertEquals("Sheet1", fromBlank.sheets().get(0).name());
        assertThrows(ApiException.class, () -> xlsxCodec.read("corrupt".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void pptxRoundTripsSlidesTitlesSubtitlesBulletsNotesAndBlankTemplate() {
        OfficeSlideContentDto input = new OfficeSlideContentDto(List.of(
            new SlideItemDto(
                "Orbit Native Office",
                "Zero-Container Inline OOXML Suite",
                List.of("Apache POI DOCX Codec", "XLSX Formula Grid", "PPTX Slide Stage"),
                "Emphasize zero external container footprint."
            ),
            new SlideItemDto(
                "Q4 Rollout Plan",
                "Production Milestones",
                List.of("Phase 1 Verification", "Phase 2 Telemetry"),
                ""
            )
        ));

        byte[] bytes = pptxCodec.write(input);
        OfficeSlideContentDto parsed = pptxCodec.read(bytes);
        assertEquals(input.slides(), parsed.slides());

        OfficeSlideContentDto fromBlank = pptxCodec.read(templateGenerator.generate(DocumentTemplateType.PPTX).bytes());
        assertEquals(1, fromBlank.slides().size());
        assertThrows(ApiException.class, () -> pptxCodec.read("bad-pptx".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void cloudOfficeServiceReadsSavesChecksOptimisticLockAndPublishesReadyEvent() {
        CloudNodeService nodeService = mock(CloudNodeService.class);
        CloudDocumentService documentService = mock(CloudDocumentService.class);
        CloudNodeMapper mapper = mock(CloudNodeMapper.class);
        CloudStorageClient storageClient = mock(CloudStorageClient.class);
        ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        CloudProperties props = new CloudProperties();
        CloudOfficeService officeService = new CloudOfficeService(
            nodeService, documentService, mapper, storageClient, props, docxCodec, xlsxCodec, pptxCodec, events
        );

        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        Instant updatedAt = Instant.parse("2026-07-01T12:00:00Z");
        CloudNodeEntity node = new CloudNodeEntity();
        node.setId(UUID.randomUUID());
        node.setNodeType(CloudNodeType.FILE);
        node.setName("spec.docx");
        node.setMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        node.setStorageKey("cloud/users/" + userId + "/" + node.getId() + "/v1");
        node.setSizeBytes(512L);
        node.setUpdatedAt(updatedAt);
        node.setUploadStatus(CloudUploadStatus.READY);

        OfficeDocContentDto docDto = new OfficeDocContentDto(List.of(new DocBlockDto("h1", "Spec", "left")), List.of());
        when(nodeService.requireActiveNode(scope, node.getId())).thenReturn(node);
        when(storageClient.getBytes(eq(node.getStorageKey()), any(Long.class))).thenReturn(docxCodec.write(docDto));
        when(documentService.replaceNodeBytes(eq(scope), eq(node.getId()), eq(userId), any())).thenReturn(node);
        when(mapper.toResponse(node)).thenReturn(mock(CloudNodeResponse.class));

        OfficeDocumentResponse readRes = officeService.getOfficeContent(scope, node.getId());
        assertEquals("DOCX", readRes.format());
        assertEquals(docDto, readRes.doc());
        assertNull(readRes.sheet());

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
}
