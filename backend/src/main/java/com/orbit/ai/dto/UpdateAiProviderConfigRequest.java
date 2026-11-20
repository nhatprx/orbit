package com.orbit.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAiProviderConfigRequest(
    @NotBlank(message = "Active provider is required.")
    String activeProvider,

    @Size(max = 64)
    String bedrockRegion,

    @NotBlank(message = "Fast model ID is required.")
    @Size(max = 160)
    String fastModel,

    @NotBlank(message = "Pro model ID is required.")
    @Size(max = 160)
    String proModel,

    @NotBlank(message = "Coder model ID is required.")
    @Size(max = 160)
    String coderModel,

    @Size(max = 160)
    String embedModel,

    Boolean webSearchEnabled
) {}
