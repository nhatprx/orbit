package com.orbit.git.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.common.ApiException;
import com.orbit.git.config.GitProperties;
import com.orbit.git.dto.GitCollaborationDtos.*;
import com.orbit.git.dto.GitCommitDto;
import com.orbit.git.dto.GitCommitFileDiffDto;
import com.orbit.git.dto.GitPullRequestDto;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** GitHub REST API client for PR detail/reviews, Actions jobs/re-runs, and branch comparison. */
@Component
public class GitHubCollaborationClient {

    private final GitProperties properties;
    private final ObjectMapper mapper;
    private final GitHubApiParser parser;
    private final GitHubPayloadBuilder payloads;
    private final HttpClient httpClient;

    public GitHubCollaborationClient(
        GitProperties properties, ObjectMapper mapper, GitHubApiParser parser, GitHubPayloadBuilder payloads
    ) {
        this.properties = properties;
        this.mapper = mapper;
        this.parser = parser;
        this.payloads = payloads;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds())).build();
    }

    public GitPrDetailDto getPullRequestDetail(String token, String owner, String repo, int pullNumber) {
        String base = repoBase(owner, repo);
        JsonNode prNode = requestJson("GET", base + "/pulls/" + pullNumber, token, null);
        GitPullRequestDto pr = parser.parsePullRequest(prNode);
        JsonNode filesNode = requestJson("GET", base + "/pulls/" + pullNumber + "/files?per_page=50", token, null);
        JsonNode commentsNode = requestJson("GET", base + "/issues/" + pullNumber + "/comments?per_page=30", token, null);
        List<GitCommitFileDiffDto> files = parseDiffFiles(filesNode);
        int adds = files.stream().mapToInt(GitCommitFileDiffDto::additions).sum();
        int dels = files.stream().mapToInt(GitCommitFileDiffDto::deletions).sum();
        return new GitPrDetailDto(pr, files, parseComments(commentsNode), adds, dels);
    }

    public void submitPullRequestReview(String token, String owner, String repo, int pullNumber, String event, String body) {
        String base = repoBase(owner, repo);
        String normEvent = event == null ? "COMMENT" : event.trim().toUpperCase();
        String safeBody = body == null ? "" : body.trim();
        if ("COMMENT".equals(normEvent)) {
            if (safeBody.isEmpty()) throw ApiException.badRequest("VALIDATION_ERROR", "Comment body is required.");
            requestJson("POST", base + "/issues/" + pullNumber + "/comments", token, Map.of("body", safeBody));
            return;
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("event", normEvent);
        if (!safeBody.isEmpty()) payload.put("body", safeBody);
        requestJson("POST", base + "/pulls/" + pullNumber + "/reviews", token, payload);
    }

    public List<GitWorkflowJobDto> listWorkflowJobs(String token, String owner, String repo, long runId) {
        JsonNode root = requestJson("GET", repoBase(owner, repo) + "/actions/runs/" + runId + "/jobs?per_page=30", token, null);
        JsonNode arr = root.path("jobs");
        if (!arr.isArray()) return List.of();
        List<GitWorkflowJobDto> out = new ArrayList<>();
        for (JsonNode j : arr) {
            List<GitWorkflowStepDto> steps = new ArrayList<>();
            JsonNode stepArr = j.path("steps");
            if (stepArr.isArray()) {
                for (JsonNode s : stepArr) {
                    steps.add(new GitWorkflowStepDto(
                        s.path("number").asInt(0), s.path("name").asText("Step"),
                        s.path("status").asText("unknown"), nullText(s.path("conclusion"))
                    ));
                }
            }
            out.add(new GitWorkflowJobDto(
                j.path("id").asLong(0), j.path("name").asText("Job"), j.path("status").asText("unknown"),
                nullText(j.path("conclusion")), parseInstant(nullText(j.path("started_at"))),
                parseInstant(nullText(j.path("completed_at"))), steps
            ));
        }
        return out;
    }

    public void rerunWorkflow(String token, String owner, String repo, long runId, boolean failedOnly) {
        String suffix = failedOnly ? "/rerun-failed-jobs" : "/rerun";
        requestJson("POST", repoBase(owner, repo) + "/actions/runs/" + runId + suffix, token, Map.of());
    }

    public GitBranchCompareDto compareBranches(String token, String owner, String repo, String baseBranch, String headBranch) {
        String spec = payloads.encodeSegment(baseBranch) + "..." + payloads.encodeSegment(headBranch);
        JsonNode root = requestJson("GET", repoBase(owner, repo) + "/compare/" + spec, token, null);
        List<GitCommitDto> commits = new ArrayList<>();
        JsonNode commitArr = root.path("commits");
        if (commitArr.isArray()) {
            for (JsonNode c : commitArr) {
                JsonNode commit = c.path("commit");
                commits.add(new GitCommitDto(
                    c.path("sha").asText(""), commit.path("message").asText("").split("\\R", 2)[0],
                    commit.path("author").path("name").asText("Unknown"),
                    commit.path("author").path("email").asText(null),
                    parseInstant(nullText(commit.path("author").path("date"))),
                    0, 0, 0, nullText(c.path("html_url"))
                ));
            }
        }
        return new GitBranchCompareDto(
            baseBranch, headBranch, root.path("status").asText("identical"),
            root.path("ahead_by").asInt(0), root.path("behind_by").asInt(0),
            root.path("total_commits").asInt(commits.size()), commits, parseDiffFiles(root.path("files"))
        );
    }

    private List<GitCommitFileDiffDto> parseDiffFiles(JsonNode arr) {
        if (arr == null || !arr.isArray()) return List.of();
        List<GitCommitFileDiffDto> out = new ArrayList<>();
        for (JsonNode f : arr) {
            out.add(new GitCommitFileDiffDto(
                f.path("filename").asText(""), f.path("status").asText("modified"),
                f.path("additions").asInt(0), f.path("deletions").asInt(0),
                f.path("changes").asInt(0), nullText(f.path("patch"))
            ));
        }
        return out;
    }

    private List<GitPrCommentDto> parseComments(JsonNode arr) {
        if (arr == null || !arr.isArray()) return List.of();
        List<GitPrCommentDto> out = new ArrayList<>();
        for (JsonNode c : arr) {
            out.add(new GitPrCommentDto(
                c.path("id").asLong(0), c.path("user").path("login").asText("unknown"),
                nullText(c.path("user").path("avatar_url")), c.path("body").asText(""),
                parseInstant(nullText(c.path("created_at")))
            ));
        }
        return out;
    }

    private JsonNode requestJson(String method, String path, String token, Object bodyObj) {
        try {
            String url = properties.getGithubApiUrl().replaceAll("/+$", "") + path;
            HttpRequest.Builder b = HttpRequest.newBuilder().uri(URI.create(url))
                .timeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds()))
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .header("Authorization", "Bearer " + token)
                .header("User-Agent", "Orbit-Git-Client");
            if (bodyObj != null) {
                b.header("Content-Type", "application/json")
                    .method(method, HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(bodyObj)));
            } else {
                b.method(method, HttpRequest.BodyPublishers.noBody());
            }
            HttpResponse<String> resp = httpClient.send(b.build(), HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                String msg = "GitHub API returned " + resp.statusCode();
                try {
                    String ghMsg = mapper.readTree(resp.body()).path("message").asText("");
                    if (!ghMsg.isBlank()) msg = ghMsg;
                } catch (Exception ignored) { /* fallback */ }
                throw new ApiException(HttpStatus.BAD_GATEWAY, "GITHUB_API_ERROR", msg);
            }
            return resp.body() == null || resp.body().isBlank() ? mapper.createObjectNode() : mapper.readTree(resp.body());
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "GITHUB_API_ERROR", "GitHub request failed: " + ex.getMessage());
        }
    }

    private String repoBase(String owner, String repo) {
        return "/repos/" + payloads.encodeSegment(owner) + "/" + payloads.encodeSegment(repo);
    }

    private static String nullText(JsonNode node) {
        return node == null || node.isNull() || node.isMissingNode() ? null : node.asText(null);
    }

    private static Instant parseInstant(String value) {
        if (value == null || value.isBlank()) return null;
        try { return Instant.parse(value); } catch (Exception ex) { return null; }
    }
}
