package com.orbit.ai.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.orbit.ai.config.AiProperties;
import com.orbit.ai.dto.AiProviderConfigDto;
import com.orbit.ai.dto.UpdateAiProviderConfigRequest;
import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.gateway.BedrockLlmGateway;
import com.orbit.ai.gateway.OpenRouterLlmGateway;
import com.orbit.ai.memory.VectorStoreClient;
import com.orbit.ai.repository.AiProviderConfigRepository;
import com.orbit.common.ApiException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiProviderConfigServiceTest {

    @Mock
    private AiProviderConfigRepository repository;
    @Mock
    private BedrockLlmGateway bedrockGateway;
    @Mock
    private OpenRouterLlmGateway openRouterGateway;
    @Mock
    private VectorStoreClient vectorStoreClient;

    private AiProviderConfigService service;

    @BeforeEach
    void setUp() {
        service = new AiProviderConfigService(
            repository, new AiProperties(), bedrockGateway, openRouterGateway, vectorStoreClient
        );
    }

    @Test
    void defaultsToBedrockAndAllowsAdminSwitchToOpenRouter() {
        when(repository.findById((short) 1)).thenReturn(Optional.empty());
        when(bedrockGateway.isConfigured()).thenReturn(true);
        when(openRouterGateway.isConfigured()).thenReturn(true);
        when(vectorStoreClient.isAvailable()).thenReturn(false);

        AiProviderConfigDto initial = service.getConfigDto();
        assertEquals("BEDROCK", initial.activeProvider());

        when(repository.save(any(AiProviderConfigEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        AiProviderConfigDto switched = service.updateConfig(
            UUID.randomUUID(),
            new UpdateAiProviderConfigRequest(
                "OPENROUTER",
                "us-east-1",
                "google/gemini-2.5-flash",
                "anthropic/claude-3.7-sonnet",
                "anthropic/claude-3.7-sonnet",
                "openai/text-embedding-3-small",
                true
            )
        );
        assertEquals("OPENROUTER", switched.activeProvider());
        assertEquals("google/gemini-2.5-flash", switched.fastModel());
    }

    @Test
    void rejectsUnknownProviderName() {
        ApiException ex = assertThrows(ApiException.class, () ->
            service.updateConfig(
                UUID.randomUUID(),
                new UpdateAiProviderConfigRequest("LOCAL_OLLAMA", "us-east-1", "a", "b", "c", "d", true)
            )
        );
        assertEquals("INVALID_AI_PROVIDER", ex.getCode());
    }
}
