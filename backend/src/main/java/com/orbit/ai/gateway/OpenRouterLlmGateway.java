package com.orbit.ai.gateway;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.ai.config.AiProperties;
import com.orbit.ai.entity.AiProviderType;
import com.orbit.ai.gateway.LlmModels.LlmMessage;
import com.orbit.ai.gateway.LlmModels.LlmRequest;
import com.orbit.ai.gateway.LlmModels.LlmResponse;
import com.orbit.ai.gateway.LlmModels.LlmStreamListener;
import com.orbit.ai.gateway.LlmModels.LlmToolCall;
import com.orbit.ai.gateway.LlmModels.LlmToolSpec;
import com.orbit.common.ApiException;
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
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

    public OpenRouterLlmGateway(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public AiProviderType provider() {
        return AiProviderType.OPENROUTER;
    }

    @Override
    public boolean isConfigured() {
        String key = properties.getOpenrouter().getApiKey();
        return key != null && !key.isBlank();
    }

    @Override
    public LlmResponse complete(LlmRequest request, LlmStreamListener listener) {
        if (!isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_NOT_CONFIGURED", "OpenRouter API key is not configured.");
        }
        String modelId = request.enableOnlineSearch() && !request.modelId().endsWith(":online")
            ? request.modelId() + ":online"
            : request.modelId();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", modelId);
        body.put("max_tokens", request.maxTokens());
        body.put("messages", toOpenAiMessages(request.systemPrompt(), request.messages()));
        if (request.tools() != null && !request.tools().isEmpty()) {
            body.put("tools", toOpenAiTools(request.tools()));
        }

        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest httpReq = HttpRequest.newBuilder()
                .uri(URI.create(properties.getOpenrouter().getBaseUrl() + "/chat/completions"))
                .timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + properties.getOpenrouter().getApiKey())
                .header("Content-Type", "application/json")
                .header("HTTP-Referer", "https://orbit.dev")
                .header("X-Title", "Orbit Workspace AI")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

            HttpResponse<String> resp = httpClient.send(httpReq, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_ERROR", "OpenRouter returned HTTP " + resp.statusCode());
            }
            return parseResponse(resp.body(), listener);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("OpenRouter completion failed: {}", ex.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_ERROR", "OpenRouter request failed: " + ex.getMessage());
        }
    }

    @Override
    public List<Float> embed(String modelId, String region, String text) {
        if (!isConfigured() || text == null || text.isBlank()) return List.of();
        try {
            Map<String, Object> body = Map.of(
                "model", modelId,
                "input", text.length() > 4000 ? text.substring(0, 4000) : text,
                "dimensions", 1024
            );
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(properties.getOpenrouter().getBaseUrl() + "/embeddings"))
                .timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + properties.getOpenrouter().getApiKey())
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

    private List<Map<String, Object>> toOpenAiMessages(String systemPrompt, List<LlmMessage> messages) {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(Map.of("role", "system", "content", systemPrompt));
        for (LlmMessage msg : messages) {
            if ("tool".equals(msg.role())) {
                list.add(Map.of("role", "tool", "tool_call_id", msg.toolCallId(), "content", msg.content()));
            } else if ("assistant".equals(msg.role()) && !msg.toolCalls().isEmpty()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("role", "assistant");
                row.put("content", msg.content() != null ? msg.content() : "");
                List<Map<String, Object>> tcs = new ArrayList<>();
                for (LlmToolCall tc : msg.toolCalls()) {
                    tcs.add(Map.of("id", tc.id(), "type", "function",
                        "function", Map.of("name", tc.name(), "arguments", writeJson(tc.arguments()))));
                }
                row.put("tool_calls", tcs);
                list.add(row);
            } else {
                list.add(Map.of("role", msg.role(), "content", msg.content()));
            }
        }
        return list;
    }

    private List<Map<String, Object>> toOpenAiTools(List<LlmToolSpec> specs) {
        List<Map<String, Object>> tools = new ArrayList<>(specs.size());
        for (LlmToolSpec spec : specs) {
            tools.add(Map.of("type", "function", "function", Map.of(
                "name", spec.name(),
                "description", spec.description(),
                "parameters", spec.inputSchema()
            )));
        }
        return tools;
    }

    private LlmResponse parseResponse(String raw, LlmStreamListener listener) throws Exception {
        JsonNode root = objectMapper.readTree(raw);
        JsonNode message = root.path("choices").path(0).path("message");
        String content = message.path("content").isMissingNode() || message.path("content").isNull()
            ? ""
            : message.path("content").asText();
        if (!content.isEmpty() && listener != null) listener.onToken(content);

        List<LlmToolCall> calls = new ArrayList<>();
        for (JsonNode tc : message.path("tool_calls")) {
            String id = tc.path("id").asText();
            String name = tc.path("function").path("name").asText();
            String argsStr = tc.path("function").path("arguments").asText("{}");
            Map<String, Object> args = objectMapper.readValue(argsStr, new TypeReference<>() {});
            calls.add(new LlmToolCall(id, name, args));
        }
        int inTok = root.path("usage").path("prompt_tokens").asInt(0);
        int outTok = root.path("usage").path("completion_tokens").asInt(0);
        return new LlmResponse(content, calls, inTok, outTok);
    }

    private String writeJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception ex) {
            return "{}";
        }
    }
}
