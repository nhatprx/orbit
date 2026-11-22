package com.orbit.whiteboard.dto;

import java.time.Instant;
import java.util.UUID;

public record WhiteboardSceneSaveResponse(
    UUID id,
    long version,
    int elementCount,
    UUID updatedBy,
    Instant updatedAt
) {}
