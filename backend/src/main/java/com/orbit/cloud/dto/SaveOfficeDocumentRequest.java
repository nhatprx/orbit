package com.orbit.cloud.dto;

import java.time.Instant;

public record SaveOfficeDocumentRequest(
    String format,
    Instant expectedUpdatedAt,
    OfficeDocContentDto doc,
    OfficeSheetContentDto sheet,
    OfficeSlideContentDto slide
) {}
