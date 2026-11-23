package com.orbit.ai.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

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

    Boolean webSearchEnabled,

    @Size(max = 512)
    String openRouterApiKey,

    @Size(max = 512)
    String openRouterMgmtKey,

    @DecimalMin(value = "0.0", message = "Default monthly budget must be non-negative.")
    BigDecimal defaultMonthlyBudgetUsd
) {
    public UpdateAiProviderConfigRequest(
        String activeProvider,
        String bedrockRegion,
        String fastModel,
        String proModel,
        String coderModel,
        String embedModel,
        Boolean webSearchEnabled
    ) {
        this(activeProvider, bedrockRegion, fastModel, proModel, coderModel, embedModel, webSearchEnabled, null, null, null);
    }
}
