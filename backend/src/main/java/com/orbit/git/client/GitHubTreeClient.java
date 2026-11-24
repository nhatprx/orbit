package com.orbit.git.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.common.ApiException;
import com.orbit.git.config.GitProperties;
import com.orbit.git.dto.GitTreeEntryDto;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Fetches a repository's full recursive file tree from GitHub in a single API request. */
@Component
public class GitHubTreeClient {

    private static final int MAX_ENTRIES = 5000;

    private final GitProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient httpClient;

    public GitHubTreeClient(GitProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds()))
            .build();
    }

    public List<GitTreeEntryDto> getRecursiveTree(String token, String owner, String repo, String branch) {
        String encodedOwner = encode(owner);
        String encodedRepo = encode(repo);
        String encodedBranch = encode(branch);
        String path = "/repos/" + encodedOwner + "/" + encodedRepo + "/git/trees/" + encodedBranch + "?recursive=1";
        JsonNode root = getJson(path, token);
        JsonNode treeNode = root.path("tree");
        if (!treeNode.isArray()) {
            return List.of();
        }
        List<GitTreeEntryDto> entries = new ArrayList<>();
        for (JsonNode item : treeNode) {
            if (entries.size() >= MAX_ENTRIES) {
                break;
            }
            String rawType = item.path("type").asText("");
            String mappedType;
            if ("tree".equals(rawType)) {
                mappedType = "dir";
            } else if ("blob".equals(rawType)) {
                mappedType = "file";
            } else {
                continue;
            }
            String entryPath = item.path("path").asText("");
            if (entryPath.isBlank()) {
                continue;
            }
            int slash = entryPath.lastIndexOf('/');
            String name = slash >= 0 ? entryPath.substring(slash + 1) : entryPath;
            long size = "file".equals(mappedType) ? item.path("size").asLong(0L) : 0L;
            String sha = item.path("sha").asText("");
            entries.add(new GitTreeEntryDto(entryPath, name, mappedType, size, sha, null));
        }
        entries.sort(Comparator
            .comparing((GitTreeEntryDto e) -> "dir".equals(e.type()) ? 0 : 1)
            .thenComparing(GitTreeEntryDto::path, String.CASE_INSENSITIVE_ORDER));
        return entries;
    }

    private JsonNode getJson(String path, String token) {
        String baseUrl = properties.getGithubApiUrl().replaceAll("/+$", "");
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + path))
            .timeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds()))
            .header("Authorization", "Bearer " + token)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "Orbit-Git-Client")
            .GET()
            .build();
        try {
            HttpResponse<String> resp = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 409) {
                return mapper.createObjectNode();
            }
            if (resp.statusCode() >= 400) {
                throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "GITHUB_API_ERROR",
                    "GitHub recursive tree request failed with status " + resp.statusCode()
                );
            }
            return resp.body() == null || resp.body().isBlank()
                ? mapper.createObjectNode()
                : mapper.readTree(resp.body());
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new ApiException(
                HttpStatus.BAD_GATEWAY,
                "GITHUB_API_ERROR",
                "GitHub recursive tree request failed: " + ex.getMessage()
            );
        }
    }

    private static String encode(String segment) {
        return URLEncoder.encode(segment, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
