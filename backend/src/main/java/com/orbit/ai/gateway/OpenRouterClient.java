package com.orbit.ai.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.ai.config.AiProperties;
import com.orbit.ai.dto.OpenRouterDtos.OpenRouterCreditsDto;
import com.orbit.ai.dto.OpenRouterDtos.OpenRouterModelDto;
import com.orbit.ai.dto.OpenRouterDtos.ProvisionedKeyResult;
import com.orbit.common.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** HTTP client for OpenRouter management, models, credits, generation cost, and OAuth PKCE APIs. */
@Component
public class OpenRouterClient {

    private static final BigDecimal ONE_MILLION = new BigDecimal("1000000");

    private final AiProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

    public OpenRouterClient(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public List<OpenRouterModelDto> fetchModels() {
        JsonNode data = getJson(baseUrl() + "/models", null).path("data");
        List<OpenRouterModelDto> models = new ArrayList<>();
        for (JsonNode n : data) {
            String id = n.path("id").asText("");
            if (id.isBlank()) continue;
            String name = n.path("name").asText(id);
            int ctx = n.path("context_length").asInt(0);
            String promptPerM = toPerMillion(n.path("pricing").path("prompt").asText("0"));
            String compPerM = toPerMillion(n.path("pricing").path("completion").asText("0"));
            models.add(new OpenRouterModelDto(id, name, ctx, promptPerM, compPerM));
        }
        return models;
    }

    public OpenRouterCreditsDto fetchCredits(String managementKey) {
        JsonNode data = getJson(baseUrl() + "/credits", managementKey).path("data");
        BigDecimal total = parseDecimal(data.path("total_credits"));
        BigDecimal used = parseDecimal(data.path("total_usage"));
        return new OpenRouterCreditsDto(total, used, total.subtract(used).max(BigDecimal.ZERO));
    }

    public BigDecimal fetchGenerationCost(String apiKey, String generationId) {
        if (apiKey == null || apiKey.isBlank() || generationId == null || generationId.isBlank()) {
            return BigDecimal.ZERO;
        }
        try {
            JsonNode data = getJson(baseUrl() + "/generation?id=" + generationId, apiKey).path("data");
            return parseDecimal(data.path("total_cost"));
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }

    public ProvisionedKeyResult createKey(String managementKey, String name, BigDecimal limitUsd) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        if (limitUsd != null && limitUsd.compareTo(BigDecimal.ZERO) > 0) {
            body.put("limit", limitUsd);
            body.put("limit_reset", "monthly");
        }
        JsonNode root = postJson(baseUrl() + "/keys", managementKey, body);
        String key = root.path("key").asText("");
        String hash = root.path("data").path("hash").asText("");
        if (key.isBlank()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OPENROUTER_KEY_CREATE_FAILED", "OpenRouter did not return a provisioned key.");
        }
        return new ProvisionedKeyResult(key, hash, limitUsd);
    }

    public void updateKeyLimit(String managementKey, String keyHash, BigDecimal limitUsd) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("limit", limitUsd);
        body.put("limit_reset", "monthly");
        sendJson("PATCH", baseUrl() + "/keys/" + keyHash, managementKey, body);
    }

    public String exchangeOAuthCode(String code, String codeVerifier) {
        Map<String, Object> body = Map.of(
            "code", code,
            "code_verifier", codeVerifier,
            "code_challenge_method", "S256"
        );
        JsonNode root = postJson(baseUrl() + "/auth/keys", null, body);
        String key = root.path("key").asText("");
        if (key.isBlank()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OPENROUTER_OAUTH_FAILED", "Failed to exchange OpenRouter OAuth code.");
        }
        return key;
    }

    private JsonNode getJson(String url, String bearer) {
        return sendJson("GET", url, bearer, null);
    }

    private JsonNode postJson(String url, String bearer, Object body) {
        return sendJson("POST", url, bearer, body);
    }

    private JsonNode sendJson(String method, String url, String bearer, Object body) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json");
            if (bearer != null && !bearer.isBlank()) {
                builder.header("Authorization", "Bearer " + bearer);
            }
            if (body != null) {
                builder.method(method, HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
            } else {
                builder.method(method, HttpRequest.BodyPublishers.noBody());
            }
            HttpResponse<String> resp = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "OPENROUTER_HTTP_ERROR", "OpenRouter returned HTTP " + resp.statusCode());
            }
            return objectMapper.readTree(resp.body());
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OPENROUTER_UNREACHABLE", "OpenRouter request failed: " + ex.getMessage());
        }
    }

    private String baseUrl() {
        return properties.getOpenrouter().getBaseUrl();
    }

    private static String toPerMillion(String perTokenRaw) {
        try {
            BigDecimal val = new BigDecimal(perTokenRaw).multiply(ONE_MILLION);
            return val.setScale(2, RoundingMode.HALF_UP).toPlainString();
        } catch (Exception ex) {
            return "0.00";
        }
    }

    private static BigDecimal parseDecimal(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(node.asText("0"));
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }
}
