package com.orbit.ai.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.ai.config.AiProperties;
import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.entity.AiProviderType;
import com.orbit.ai.gateway.LlmModels.LlmRequest;
import com.orbit.ai.gateway.LlmModels.LlmResponse;
import com.orbit.ai.gateway.LlmModels.LlmStreamListener;
import com.orbit.ai.gateway.LlmModels.LlmToolCall;
import com.orbit.ai.repository.AiProviderConfigRepository;
import com.orbit.ai.service.AiSecretCipher;
import com.orbit.common.ApiException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class OpenRouterLlmGateway implements LlmGateway {

    private static final Logger log = LoggerFactory.getLogger(OpenRouterLlmGateway.class);

    private final AiProperties properties;
    private final ObjectMapper objectMapper;
    private final AiProviderConfigRepository configRepository;
    private final AiSecretCipher secretCipher;
    private final OpenRouterClient openRouterClient;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

    public OpenRouterLlmGateway(
        AiProperties properties,
        ObjectMapper objectMapper,
        AiProviderConfigRepository configRepository,
        AiSecretCipher secretCipher,
        OpenRouterClient openRouterClient
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.configRepository = configRepository;
        this.secretCipher = secretCipher;
        this.openRouterClient = openRouterClient;
    }

    @Override
    public AiProviderType provider() {
        return AiProviderType.OPENROUTER;
    }

    @Override
    public boolean isConfigured() {
        String key = resolveSystemApiKey();
        return key != null && !key.isBlank();
    }

    @Override
    public LlmResponse complete(LlmRequest request, LlmStreamListener listener) {
        String apiKey = (request.apiKeyOverride() != null && !request.apiKeyOverride().isBlank())
            ? request.apiKeyOverride()
            : resolveSystemApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_NOT_CONFIGURED", "OpenRouter API key is not configured.");
        }
        String modelId = request.enableOnlineSearch() && !request.modelId().endsWith(":online")
            ? request.modelId() + ":online"
            : request.modelId();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", modelId);
        body.put("max_tokens", request.maxTokens());
        body.put("usage", Map.of("include", true));
        body.put("reasoning", Map.of("exclude", true));
        body.put("messages", OpenRouterPayloadMapper.toOpenAiMessages(objectMapper, request.systemPrompt(), request.messages()));
        if (request.tools() != null && !request.tools().isEmpty()) {
            body.put("tools", OpenRouterPayloadMapper.toOpenAiTools(request.tools()));
        }

        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest httpReq = HttpRequest.newBuilder()
                .uri(URI.create(properties.getOpenrouter().getBaseUrl() + "/chat/completions"))
                .timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .header("HTTP-Referer", "https://orbit.dev")
                .header("X-Title", "Orbit Workspace AI")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

            HttpResponse<String> resp = httpClient.send(httpReq, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                String detail = extractErrorMessage(resp.body());
                log.warn("OpenRouter HTTP {} for model {}: {}", resp.statusCode(), modelId, detail);
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_ERROR",
                    "OpenRouter HTTP " + resp.statusCode() + (detail != null ? ": " + detail : ""));
            }
            return parseResponse(resp.body(), apiKey, listener);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("OpenRouter completion failed: {}", ex.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_ERROR", "OpenRouter request failed: " + ex.getMessage());
        }
    }

    @Override
    public List<Float> embed(String modelId, String region, String text) {
        String apiKey = resolveSystemApiKey();
        if (apiKey == null || apiKey.isBlank() || text == null || text.isBlank()) return List.of();
        try {
            Map<String, Object> body = Map.of(
                "model", modelId,
                "input", text.length() > 4000 ? text.substring(0, 4000) : text,
                "dimensions", 1024
            );
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(properties.getOpenrouter().getBaseUrl() + "/embeddings"))
                .timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) return List.of();
            JsonNode vec = objectMapper.readTree(resp.body()).path("data").path(0).path("embedding");
            List<Float> result = new ArrayList<>(vec.size());
            for (JsonNode n : vec) result.add((float) n.asDouble());
            return result;
        } catch (Exception ex) {
            log.warn("OpenRouter embedding failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private LlmResponse parseResponse(String raw, String apiKey, LlmStreamListener listener) throws Exception {
        JsonNode root = objectMapper.readTree(raw);
        String generationId = root.path("id").asText(null);
        JsonNode message = root.path("choices").path(0).path("message");
        String content = OpenRouterPayloadMapper.cleanContent(
            message.path("content").isMissingNode() || message.path("content").isNull()
                ? ""
                : message.path("content").asText()
        );
        if (!content.isEmpty() && listener != null) listener.onToken(content);

        List<LlmToolCall> calls = OpenRouterPayloadMapper.parseToolCalls(objectMapper, message);
        JsonNode usage = root.path("usage");
        int inTok = usage.path("prompt_tokens").asInt(0);
        int outTok = usage.path("completion_tokens").asInt(0);
        BigDecimal cost = OpenRouterPayloadMapper.parseCost(usage.path("cost"));
        if (cost.compareTo(BigDecimal.ZERO) == 0 && generationId != null) {
            cost = openRouterClient.fetchGenerationCost(apiKey, generationId);
        }
        return new LlmResponse(content, calls, inTok, outTok, generationId, cost);
    }

    private String resolveSystemApiKey() {
        String dbEnc = configRepository.findById((short) 1)
            .map(AiProviderConfigEntity::getOpenrouterApiKeyEnc)
            .orElse(null);
        String dbKey = secretCipher.decrypt(dbEnc);
        return (dbKey != null && !dbKey.isBlank()) ? dbKey : properties.getOpenrouter().getApiKey();
    }

    private String extractErrorMessage(String raw) {
        try {
            String msg = objectMapper.readTree(raw).path("error").path("message").asText("");
            return msg.isBlank() ? null : msg;
        } catch (Exception ex) {
            return null;
        }
    }
}
