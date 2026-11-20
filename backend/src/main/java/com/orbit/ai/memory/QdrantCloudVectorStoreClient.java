package com.orbit.ai.memory;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.ai.config.AiProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Qdrant Cloud HTTPS REST client supporting multiple collections (memories & file RAG chunks). */
@Component
public class QdrantCloudVectorStoreClient implements VectorStoreClient {

    private static final Logger log = LoggerFactory.getLogger(QdrantCloudVectorStoreClient.class);
    private static final int VECTOR_SIZE = 1024;

    private final AiProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final Set<String> readyCollections = ConcurrentHashMap.newKeySet();

    public QdrantCloudVectorStoreClient(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean isAvailable() {
        String url = properties.getQdrant().getUrl();
        return url != null && !url.isBlank();
    }

    @Override
    public boolean upsert(String collection, String pointId, List<Float> vector, Map<String, Object> payload) {
        if (!isAvailable() || vector == null || vector.size() != VECTOR_SIZE) return false;
        String col = resolveCollection(collection);
        ensureCollection(col);
        try {
            Map<String, Object> point = Map.of("id", pointId, "vector", vector, "payload", payload);
            String body = objectMapper.writeValueAsString(Map.of("points", List.of(point)));
            HttpResponse<String> resp = send("PUT", "/collections/" + col + "/points?wait=true", body);
            return resp.statusCode() >= 200 && resp.statusCode() < 300;
        } catch (Exception ex) {
            log.warn("Qdrant Cloud upsert failed ({}): {}", col, ex.getMessage());
            return false;
        }
    }

    @Override
    public List<VectorHit> search(String collection, List<Float> queryVector, Map<String, String> filters, int limit) {
        if (!isAvailable() || queryVector == null || queryVector.size() != VECTOR_SIZE) return List.of();
        String col = resolveCollection(collection);
        ensureCollection(col);
        try {
            List<Map<String, Object>> must = new ArrayList<>();
            for (Map.Entry<String, String> entry : filters.entrySet()) {
                if (entry.getValue() != null && !entry.getValue().isBlank()) {
                    must.add(Map.of("key", entry.getKey(), "match", Map.of("value", entry.getValue())));
                }
            }
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("vector", queryVector);
            body.put("limit", limit);
            body.put("with_payload", true);
            if (!must.isEmpty()) body.put("filter", Map.of("must", must));

            HttpResponse<String> resp = send("POST", "/collections/" + col + "/points/search", objectMapper.writeValueAsString(body));
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) return List.of();
            JsonNode results = objectMapper.readTree(resp.body()).path("result");
            List<VectorHit> hits = new ArrayList<>();
            for (JsonNode item : results) {
                Map<String, Object> payload = objectMapper.convertValue(item.path("payload"), new TypeReference<>() {});
                hits.add(new VectorHit(item.path("id").asText(), item.path("score").asDouble(), payload));
            }
            return hits;
        } catch (Exception ex) {
            log.warn("Qdrant Cloud search failed ({}): {}", col, ex.getMessage());
            return List.of();
        }
    }

    @Override
    public void delete(String collection, String pointId) {
        if (!isAvailable() || pointId == null || pointId.isBlank()) return;
        String col = resolveCollection(collection);
        try {
            String body = objectMapper.writeValueAsString(Map.of("points", List.of(pointId)));
            send("POST", "/collections/" + col + "/points/delete?wait=true", body);
        } catch (Exception ex) {
            log.warn("Qdrant Cloud delete failed ({}): {}", col, ex.getMessage());
        }
    }

    private void ensureCollection(String col) {
        if (readyCollections.contains(col)) return;
        try {
            HttpResponse<String> check = send("GET", "/collections/" + col, null);
            if (check.statusCode() == 200) {
                readyCollections.add(col);
                return;
            }
            String body = objectMapper.writeValueAsString(Map.of(
                "vectors", Map.of("size", VECTOR_SIZE, "distance", "Cosine")
            ));
            HttpResponse<String> created = send("PUT", "/collections/" + col, body);
            if (created.statusCode() >= 200 && created.statusCode() < 300) {
                readyCollections.add(col);
            }
        } catch (Exception ex) {
            log.warn("Qdrant Cloud collection init failed ({}): {}", col, ex.getMessage());
        }
    }

    private HttpResponse<String> send(String method, String path, String jsonBody) throws Exception {
        String base = properties.getQdrant().getUrl().replaceAll("/+$", "");
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(base + path))
            .timeout(Duration.ofSeconds(15))
            .header("Content-Type", "application/json");
        String apiKey = properties.getQdrant().getApiKey();
        if (apiKey != null && !apiKey.isBlank()) {
            builder.header("api-key", apiKey);
        }
        HttpRequest.BodyPublisher publisher = jsonBody == null
            ? HttpRequest.BodyPublishers.noBody()
            : HttpRequest.BodyPublishers.ofString(jsonBody);
        builder.method(method, publisher);
        return httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String resolveCollection(String collection) {
        return collection != null && !collection.isBlank()
            ? collection
            : properties.getQdrant().getCollection();
    }
}
