package com.orbit.ai.dto;

import com.orbit.ai.entity.AiProviderConfigEntity;

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
    String updatedAt
) {

    public static AiProviderConfigDto from(
        AiProviderConfigEntity entity,
        boolean bedrockConfigured,
        boolean openRouterConfigured,
        boolean qdrantConfigured,
        boolean tavilyConfigured
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
            entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null
        );
    }
}
