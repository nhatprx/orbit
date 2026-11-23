package com.orbit.ai.dto;

import com.orbit.ai.entity.AiProviderConfigEntity;
import java.math.BigDecimal;

public record AiProviderConfigDto(
    String activeProvider,
    String bedrockRegion,
    String fastModel,
    String proModel,
    String coderModel,
    String embedModel,
    boolean webSearchEnabled,
    boolean bedrockConfigured,
    boolean openRouterConfigured,
    boolean qdrantConfigured,
    boolean tavilyConfigured,
    String openRouterApiKeyPreview,
    boolean openRouterMgmtConfigured,
    String openRouterMgmtKeyPreview,
    BigDecimal defaultMonthlyBudgetUsd,
    String updatedAt
) {

    public static AiProviderConfigDto from(
        AiProviderConfigEntity entity,
        boolean bedrockConfigured,
        boolean openRouterConfigured,
        boolean qdrantConfigured,
        boolean tavilyConfigured,
        String openRouterApiKeyPreview,
        boolean openRouterMgmtConfigured,
        String openRouterMgmtKeyPreview
    ) {
        return new AiProviderConfigDto(
            entity.getActiveProvider().name(),
            entity.getBedrockRegion(),
            entity.getFastModel(),
            entity.getProModel(),
            entity.getCoderModel(),
            entity.getEmbedModel(),
            entity.isWebSearchEnabled(),
            bedrockConfigured,
            openRouterConfigured,
            qdrantConfigured,
            tavilyConfigured,
            openRouterApiKeyPreview,
            openRouterMgmtConfigured,
            openRouterMgmtKeyPreview,
            entity.getDefaultMonthlyBudgetUsd(),
            entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null
        );
    }
}
