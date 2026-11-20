package com.orbit.ai.service;

import com.orbit.ai.config.AiProperties;
import com.orbit.ai.dto.AiProviderConfigDto;
import com.orbit.ai.dto.UpdateAiProviderConfigRequest;
import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.entity.AiProviderType;
import com.orbit.ai.gateway.BedrockLlmGateway;
import com.orbit.ai.gateway.OpenRouterLlmGateway;
import com.orbit.ai.memory.VectorStoreClient;
import com.orbit.ai.repository.AiProviderConfigRepository;
import com.orbit.common.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiProviderConfigService {

    private final AiProviderConfigRepository repository;
    private final AiProperties properties;
    private final BedrockLlmGateway bedrockGateway;
    private final OpenRouterLlmGateway openRouterGateway;
    private final VectorStoreClient vectorStoreClient;

    public AiProviderConfigService(
        AiProviderConfigRepository repository,
        AiProperties properties,
        BedrockLlmGateway bedrockGateway,
        OpenRouterLlmGateway openRouterGateway,
        VectorStoreClient vectorStoreClient
    ) {
        this.repository = repository;
        this.properties = properties;
        this.bedrockGateway = bedrockGateway;
        this.openRouterGateway = openRouterGateway;
        this.vectorStoreClient = vectorStoreClient;
    }

    @Transactional(readOnly = true)
    public AiProviderConfigEntity getActiveEntity() {
        return repository.findById((short) 1).orElseGet(this::buildDefaultEntity);
    }

    @Transactional(readOnly = true)
    public AiProviderConfigDto getConfigDto() {
        return toDto(getActiveEntity());
    }

    @Transactional
    public AiProviderConfigDto updateConfig(UUID adminUserId, UpdateAiProviderConfigRequest request) {
        AiProviderType provider = parseProvider(request.activeProvider());
        AiProviderConfigEntity entity = repository.findById((short) 1).orElseGet(this::buildDefaultEntity);
        entity.setActiveProvider(provider);
        if (request.bedrockRegion() != null && !request.bedrockRegion().isBlank()) {
            entity.setBedrockRegion(request.bedrockRegion().trim());
        }
        entity.setFastModel(request.fastModel().trim());
        entity.setProModel(request.proModel().trim());
        entity.setCoderModel(request.coderModel().trim());
        if (request.embedModel() != null && !request.embedModel().isBlank()) {
            entity.setEmbedModel(request.embedModel().trim());
        }
        if (request.webSearchEnabled() != null) {
            entity.setWebSearchEnabled(request.webSearchEnabled());
        }
        entity.setUpdatedBy(adminUserId);
        return toDto(repository.save(entity));
    }

    public String resolveModelId(AiProviderConfigEntity cfg, String tier) {
        if ("orbit-fast".equals(tier)) return cfg.getFastModel();
        if ("orbit-coder".equals(tier)) return cfg.getCoderModel();
        return cfg.getProModel();
    }

    private AiProviderConfigEntity buildDefaultEntity() {
        AiProviderType defaultProvider = parseProviderSafe(properties.getProvider());
        AiProviderConfigEntity e = new AiProviderConfigEntity();
        e.setId((short) 1);
        e.setActiveProvider(defaultProvider);
        e.setBedrockRegion(properties.getBedrock().getRegion());
        if (defaultProvider == AiProviderType.OPENROUTER) {
            e.setFastModel(properties.getOpenrouter().getFastModel());
            e.setProModel(properties.getOpenrouter().getProModel());
            e.setCoderModel(properties.getOpenrouter().getCoderModel());
            e.setEmbedModel(properties.getOpenrouter().getEmbedModel());
        } else {
            e.setFastModel(properties.getBedrock().getFastModel());
            e.setProModel(properties.getBedrock().getProModel());
            e.setCoderModel(properties.getBedrock().getCoderModel());
            e.setEmbedModel(properties.getBedrock().getEmbedModel());
        }
        e.setWebSearchEnabled(properties.isWebSearchEnabled());
        return e;
    }

    private AiProviderType parseProvider(String raw) {
        try {
            return AiProviderType.valueOf(raw.trim().toUpperCase());
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_AI_PROVIDER", "Provider must be BEDROCK or OPENROUTER.");
        }
    }

    private AiProviderType parseProviderSafe(String raw) {
        try {
            return AiProviderType.valueOf(raw.trim().toUpperCase());
        } catch (Exception ex) {
            return AiProviderType.BEDROCK;
        }
    }

    private AiProviderConfigDto toDto(AiProviderConfigEntity entity) {
        boolean tavilyReady = properties.getTavily().getApiKey() != null && !properties.getTavily().getApiKey().isBlank();
        return AiProviderConfigDto.from(
            entity,
            bedrockGateway.isConfigured(),
            openRouterGateway.isConfigured(),
            vectorStoreClient.isAvailable(),
            tavilyReady
        );
    }
}
