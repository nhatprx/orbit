package com.orbit.ai.gateway;

import com.orbit.ai.entity.AiProviderType;
import com.orbit.ai.gateway.LlmModels.LlmRequest;
import com.orbit.ai.gateway.LlmModels.LlmResponse;
import com.orbit.ai.gateway.LlmModels.LlmStreamListener;
import java.util.List;

public interface LlmGateway {

    AiProviderType provider();

    boolean isConfigured();

    LlmResponse complete(LlmRequest request, LlmStreamListener listener);

    List<Float> embed(String modelId, String region, String text);
}
