package com.orbit.cloud.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateDocumentRequest(
    UUID parentId,
    @NotBlank String name,
    @NotNull DocumentTemplateType templateType
) {}
