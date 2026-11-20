package com.orbit.ai.gateway;

import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.entity.AiProviderType;
import com.orbit.ai.gateway.LlmModels.LlmRequest;
import com.orbit.ai.gateway.LlmModels.LlmResponse;
import com.orbit.ai.gateway.LlmModels.LlmStreamListener;
import com.orbit.ai.service.AiProviderConfigService;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class LlmGatewayRouter {

    private final AiProviderConfigService configService;
    private final BedrockLlmGateway bedrockGateway;
    private final OpenRouterLlmGateway openRouterGateway;

    public LlmGatewayRouter(
        AiProviderConfigService configService,
        BedrockLlmGateway bedrockGateway,
        OpenRouterLlmGateway openRouterGateway
    ) {
        this.configService = configService;
        this.bedrockGateway = bedrockGateway;
        this.openRouterGateway = openRouterGateway;
    }

    public LlmGateway activeGateway() {
        return gatewayFor(configService.getActiveEntity().getActiveProvider());
    }

    public LlmGateway gatewayFor(AiProviderType type) {
        return type == AiProviderType.OPENROUTER ? openRouterGateway : bedrockGateway;
    }

    public LlmResponse complete(AiProviderConfigEntity cfg, LlmRequest request, LlmStreamListener listener) {
        return gatewayFor(cfg.getActiveProvider()).complete(request, listener);
    }

    public List<Float> embed(AiProviderConfigEntity cfg, String text) {
        return gatewayFor(cfg.getActiveProvider()).embed(cfg.getEmbedModel(), cfg.getBedrockRegion(), text);
    }
}
