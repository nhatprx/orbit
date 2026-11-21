package com.orbit.cloud.dto;

import java.time.Instant;
import java.util.UUID;

public record OfficeDocumentResponse(
    UUID nodeId,
    String name,
    String mimeType,
    String format,
    long sizeBytes,
    Instant updatedAt,
    String etag,
    OfficeDocContentDto doc,
    OfficeSheetContentDto sheet,
    OfficeSlideContentDto slide
) {}
