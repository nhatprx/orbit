package com.orbit.git.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.git.config.GitProperties;
import com.orbit.git.dto.GitCollaboratorDto;
import com.orbit.git.dto.GitRepoStatsDto;
import com.orbit.git.dto.GitRepoStatsDto.GitContributorDto;
import com.orbit.git.dto.GitWorkflowRunDto;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Fetches GitHub Actions workflow runs and repository collaborators via the GitHub REST API. */
@Component
public class GitHubInsightsClient {

    private static final Logger log = LoggerFactory.getLogger(GitHubInsightsClient.class);

    private final GitProperties properties;
    private final ObjectMapper mapper;
    private final GitHubPayloadBuilder payloads;
    private final HttpClient httpClient;

    public GitHubInsightsClient(GitProperties properties, ObjectMapper mapper, GitHubPayloadBuilder payloads) {
        this.properties = properties;
        this.mapper = mapper;
        this.payloads = payloads;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds()))
            .build();
    }

    public List<GitWorkflowRunDto> listWorkflowRuns(String token, String owner, String repo, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 30));
        String path = repoBase(owner, repo) + "/actions/runs?per_page=" + safeLimit;
        JsonNode root = getJsonQuietly(path, token);
        if (root == null) return List.of();
        JsonNode runs = root.path("workflow_runs");
        if (!runs.isArray()) return List.of();
        List<GitWorkflowRunDto> out = new ArrayList<>();
        for (JsonNode n : runs) {
            out.add(new GitWorkflowRunDto(
                n.path("id").asLong(0L),
                n.path("name").asText("Workflow"),
                n.path("head_branch").asText(""),
                n.path("head_sha").asText(""),
                n.path("status").asText("unknown"),
                n.path("conclusion").isNull() ? null : n.path("conclusion").asText(null),
                n.path("event").asText("push"),
                n.path("actor").path("login").asText("unknown"),
                n.path("html_url").asText(""),
                parseInstant(n.path("created_at").asText(null)),
                parseInstant(n.path("updated_at").asText(null))
            ));
        }
        return out;
    }

    public List<GitCollaboratorDto> listCollaborators(String token, String owner, String repo) {
        String path = repoBase(owner, repo) + "/collaborators?per_page=30";
        JsonNode arr = getJsonQuietly(path, token);
        if (arr == null || !arr.isArray()) return List.of();
        List<GitCollaboratorDto> out = new ArrayList<>();
        for (JsonNode n : arr) {
            String role = n.path("role_name").asText("");
            if (role.isBlank()) {
                JsonNode perms = n.path("permissions");
                if (perms.path("admin").asBoolean(false)) role = "admin";
                else if (perms.path("maintain").asBoolean(false)) role = "maintain";
                else if (perms.path("push").asBoolean(false)) role = "write";
                else role = "read";
            }
            out.add(new GitCollaboratorDto(
                n.path("login").asText(""),
                n.path("avatar_url").asText(null),
                n.path("html_url").asText(""),
                role
            ));
        }
        return out;
    }

    public GitRepoStatsDto getRepoStats(String token, String owner, String repo) {
        String base = repoBase(owner, repo);
        JsonNode repoNode = getJsonQuietly(base, token);
        JsonNode views = getJsonQuietly(base + "/traffic/views", token);
        JsonNode clones = getJsonQuietly(base + "/traffic/clones", token);
        JsonNode contribs = getJsonQuietly(base + "/contributors?per_page=10", token);

        List<GitContributorDto> top = new ArrayList<>();
        if (contribs != null && contribs.isArray()) {
            for (JsonNode c : contribs) {
                top.add(new GitContributorDto(
                    c.path("login").asText("unknown"),
                    c.path("avatar_url").asText(null),
                    c.path("html_url").asText(""),
                    c.path("contributions").asInt(0)
                ));
            }
        }
        return new GitRepoStatsDto(
            views == null ? 0 : views.path("count").asInt(0),
            views == null ? 0 : views.path("uniques").asInt(0),
            clones == null ? 0 : clones.path("count").asInt(0),
            clones == null ? 0 : clones.path("uniques").asInt(0),
            repoNode == null ? 0 : repoNode.path("stargazers_count").asInt(0),
            repoNode == null ? 0 : repoNode.path("forks_count").asInt(0),
            repoNode == null ? 0 : repoNode.path("subscribers_count").asInt(0),
            repoNode == null ? 0 : repoNode.path("open_issues_count").asInt(0),
            top
        );
    }

    private JsonNode getJsonQuietly(String path, String token) {
        try {
            String base = properties.getGithubApiUrl().replaceAll("/+$", "");
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(base + path))
                .timeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds()))
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .header("Authorization", "Bearer " + token)
                .header("User-Agent", "Orbit-Git-Client")
                .GET()
                .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                log.debug("GitHub insights request {} returned {}", path, resp.statusCode());
                return null;
            }
            return mapper.readTree(resp.body());
        } catch (Exception ex) {
            log.debug("GitHub insights request {} failed: {}", path, ex.getMessage());
            return null;
        }
    }

    private String repoBase(String owner, String repo) {
        return "/repos/" + payloads.encodeSegment(owner) + "/" + payloads.encodeSegment(repo);
    }

    private static Instant parseInstant(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (Exception ex) {
            return null;
        }
    }
}
