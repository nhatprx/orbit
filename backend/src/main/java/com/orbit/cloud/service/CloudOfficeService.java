package com.orbit.cloud.service;

import com.orbit.cloud.config.CloudProperties;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.OfficeDocContentDto;
import com.orbit.cloud.dto.OfficeDocumentResponse;
import com.orbit.cloud.dto.OfficeSheetContentDto;
import com.orbit.cloud.dto.OfficeSlideContentDto;
import com.orbit.cloud.dto.SaveOfficeDocumentRequest;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.event.CloudFileReadyEvent;
import com.orbit.common.ApiException;
import com.orbit.storage.service.CloudStorageClient;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service reading and writing structured Orbit Native Office (.docx, .xlsx, .pptx) documents via Apache POI. */
@Service
public class CloudOfficeService {

    public static final long MAX_OFFICE_BYTES = 26_214_400L;

    private final CloudNodeService nodeService;
    private final CloudDocumentService documentService;
    private final CloudNodeMapper mapper;
    private final CloudStorageClient storageClient;
    private final CloudProperties cloudProperties;
    private final DocxOfficeCodec docxCodec;
    private final XlsxOfficeCodec xlsxCodec;
    private final PptxOfficeCodec pptxCodec;
    private final ApplicationEventPublisher eventPublisher;

    public CloudOfficeService(
        CloudNodeService nodeService, CloudDocumentService documentService, CloudNodeMapper mapper,
        CloudStorageClient storageClient, CloudProperties cloudProperties,
        DocxOfficeCodec docxCodec, XlsxOfficeCodec xlsxCodec, PptxOfficeCodec pptxCodec,
        ApplicationEventPublisher eventPublisher
    ) {
        this.nodeService = nodeService;
        this.documentService = documentService;
        this.mapper = mapper;
        this.storageClient = storageClient;
        this.cloudProperties = cloudProperties;
        this.docxCodec = docxCodec;
        this.xlsxCodec = xlsxCodec;
        this.pptxCodec = pptxCodec;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public OfficeDocumentResponse getOfficeContent(CloudScope scope, UUID nodeId) {
        CloudNodeEntity node = requireActiveFile(scope, nodeId);
        String format = detectNodeFormat(node.getName(), node.getMimeType());
        long maxBytes = effectiveOfficeSizeCap();
        if (node.getSizeBytes() > maxBytes) {
            throw officeTooLarge();
        }
        byte[] bytes = storageClient.getBytes(node.getStorageKey(), maxBytes);
        OfficeDocContentDto doc = null;
        OfficeSheetContentDto sheet = null;
        OfficeSlideContentDto slide = null;
        switch (format) {
            case "DOCX" -> doc = docxCodec.read(bytes);
            case "XLSX" -> sheet = xlsxCodec.read(bytes);
            case "PPTX" -> slide = pptxCodec.read(bytes);
            default -> throw unsupportedFormat();
        }
        return new OfficeDocumentResponse(
            node.getId(), node.getName(), node.getMimeType(), format,
            node.getSizeBytes(), node.getUpdatedAt(), node.getEtag(), doc, sheet, slide
        );
    }

    @Transactional
    public CloudNodeResponse saveOfficeContent(
        CloudScope scope, UUID userId, UUID nodeId, SaveOfficeDocumentRequest req
    ) {
        nodeService.requireWritable(scope, nodeId);
        if (req == null) {
            throw ApiException.badRequest("INVALID_REQUEST", "Office save payload is required.");
        }
        CloudNodeEntity node = requireActiveFile(scope, nodeId);
        verifyExpectedUpdatedAt(node.getUpdatedAt(), req.expectedUpdatedAt());
        String format = validateSaveFormat(req.format(), node.getName(), node.getMimeType());
        byte[] bytes = switch (format) {
            case "DOCX" -> docxCodec.write(req.doc());
            case "XLSX" -> xlsxCodec.write(req.sheet());
            case "PPTX" -> pptxCodec.write(req.slide());
            default -> throw unsupportedFormat();
        };
        if (bytes.length > effectiveOfficeSizeCap()) {
            throw officeTooLarge();
        }
        CloudNodeEntity saved = documentService.replaceNodeBytes(scope, nodeId, userId, bytes);
        eventPublisher.publishEvent(new CloudFileReadyEvent(saved.getId()));
        return mapper.toResponse(saved);
    }

    private long effectiveOfficeSizeCap() {
        long configured = cloudProperties.getMaxOfficeFileSizeBytes();
        return configured > 0 ? Math.min(configured, MAX_OFFICE_BYTES) : MAX_OFFICE_BYTES;
    }

    private CloudNodeEntity requireActiveFile(CloudScope scope, UUID nodeId) {
        CloudNodeEntity node = nodeService.requireActiveNode(scope, nodeId);
        if (node.getNodeType() != CloudNodeType.FILE || node.getStorageKey() == null) {
            throw ApiException.badRequest("NOT_A_FILE", "Target node must be a file.");
        }
        return node;
    }

    private static void verifyExpectedUpdatedAt(Instant actual, Instant expected) {
        if (expected != null && actual != null) {
            Instant currentMs = actual.truncatedTo(ChronoUnit.MILLIS);
            Instant expectedMs = expected.truncatedTo(ChronoUnit.MILLIS);
            if (!currentMs.equals(expectedMs)) {
                throw ApiException.conflict(
                    "CONFLICT_MODIFIED", "This file was modified elsewhere. Reload before saving."
                );
            }
        }
    }

    private static String validateSaveFormat(String explicitFormat, String name, String mimeType) {
        String nodeFormat = detectNodeFormat(name, mimeType);
        if (explicitFormat != null && !explicitFormat.isBlank()) {
            String upper = explicitFormat.trim().toUpperCase(Locale.ROOT);
            if (!upper.equals(nodeFormat)) {
                throw ApiException.badRequest(
                    "OFFICE_FORMAT_MISMATCH",
                    "Requested format " + upper + " does not match file format " + nodeFormat + "."
                );
            }
        }
        return nodeFormat;
    }

    private static String detectNodeFormat(String name, String mimeType) {
        String lowerName = name != null ? name.toLowerCase(Locale.ROOT) : "";
        String lowerMime = mimeType != null ? mimeType.toLowerCase(Locale.ROOT) : "";
        if (lowerName.endsWith(".docx") || lowerMime.contains("wordprocessingml")) return "DOCX";
        if (lowerName.endsWith(".xlsx") || lowerMime.contains("spreadsheetml")) return "XLSX";
        if (lowerName.endsWith(".pptx") || lowerMime.contains("presentationml")) return "PPTX";
        throw unsupportedFormat();
    }

    private static ApiException unsupportedFormat() {
        return ApiException.badRequest(
            "UNSUPPORTED_OFFICE_FORMAT", "Only DOCX, XLSX, and PPTX documents are supported by Orbit Native Office."
        );
    }

    private static ApiException officeTooLarge() {
        return new ApiException(
            HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Orbit Native Office supports files up to 25 MB."
        );
    }
}
