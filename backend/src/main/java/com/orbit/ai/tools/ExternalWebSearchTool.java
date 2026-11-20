package com.orbit.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.ai.config.AiProperties;
import com.orbit.ai.dto.AiCitationDto;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** External web search backed by Tavily Cloud Search API. */
@Component
public class ExternalWebSearchTool {

    private final AiProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public ExternalWebSearchTool(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        String key = properties.getTavily().getApiKey();
        return key != null && !key.isBlank();
    }

    public AiToolResult search(String query) {
        if (query == null || query.isBlank()) {
            return AiToolResult.text("Search query was empty.", "Empty query");
        }
        if (!isConfigured()) {
            return AiToolResult.text(
                "External web search API key (ORBIT_AI_TAVILY_API_KEY) is not configured on the server.",
                "Web search not configured"
            );
        }
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                "api_key", properties.getTavily().getApiKey(),
                "query", query.trim(),
                "max_results", 5,
                "include_answer", true
            ));
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.tavily.com/search"))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                return AiToolResult.text("Web search failed with HTTP " + resp.statusCode(), "Search error");
            }
            JsonNode root = objectMapper.readTree(resp.body());
            StringBuilder out = new StringBuilder();
            String answer = root.path("answer").asText("");
            if (!answer.isBlank()) out.append("Summary: ").append(answer).append("\n\n");

            List<AiCitationDto> citations = new ArrayList<>();
            for (JsonNode item : root.path("results")) {
                String title = item.path("title").asText("Web result");
                String url = item.path("url").asText("");
                String content = item.path("content").asText("");
                out.append("- ").append(title).append(" (").append(url).append("): ").append(content).append("\n");
                if (!url.isBlank()) citations.add(new AiCitationDto("web", title, url));
            }
            return new AiToolResult(out.toString(), "Found " + citations.size() + " web results", citations);
        } catch (Exception ex) {
            return AiToolResult.text("Web search error: " + ex.getMessage(), "Search error");
        }
    }
}
