package com.orbit.git.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.common.ApiException;
import com.orbit.git.config.GitProperties;
import com.orbit.git.dto.*;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Java HttpClient implementation of {@link GitHubClient} against the GitHub REST API. */
@Component
public class HttpGitHubClient implements GitHubClient {

    private final GitProperties properties;
    private final ObjectMapper mapper;
    private final GitHubApiParser parser;
    private final GitHubPayloadBuilder payloads;
    private final HttpClient httpClient;

    public HttpGitHubClient(
        GitProperties properties, ObjectMapper mapper, GitHubApiParser parser, GitHubPayloadBuilder payloads
    ) {
        this.properties = properties;
        this.mapper = mapper;
        this.parser = parser;
        this.payloads = payloads;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds())).build();
    }

    @Override
    public InspectGitTokenResponse inspectToken(String token) {
        HttpResponse<String> userResp = send("GET", "/user", token, null);
        List<String> scopes = parser.parseScopes(userResp.headers().firstValue("X-OAuth-Scopes").orElse(""));
        JsonNode repos = getJson("/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator,organization_member", token);
        return parser.parseInspectToken(parseJson(userResp.body()), scopes, repos);
    }

    @Override
    public GitHubRemoteRepoDto getRepository(String token, String owner, String repo) {
        return parser.parseRemoteRepo(getJson(repoBase(owner, repo), token));
    }

    @Override
    public GitHubRemoteRepoDto createRepository(String token, String name, String description, boolean privateRepo) {
        return parser.parseRemoteRepo(parseJson(send("POST", "/user/repos", token, payloads.createRepositoryPayload(name, description, privateRepo)).body()));
    }

    @Override
    public GitHubRemoteRepoDto createRepository(String token, CreateGitRepoRequest req) {
        return parser.parseRemoteRepo(parseJson(send("POST", "/user/repos", token, payloads.createRepositoryPayload(req)).body()));
    }

    @Override
    public List<GitBranchDto> listBranches(String token, String owner, String repo, String defaultBranch) {
        return parser.parseBranches(getJson(repoBase(owner, repo) + "/branches?per_page=100", token), defaultBranch);
    }

    @Override
    public GitBranchDto createBranch(
        String token, String owner, String repo, String branchName, String sourceBranch, String defaultBranch
    ) {
        String refPath = repoBase(owner, repo) + "/git/ref/heads/" + payloads.encodePath(sourceBranch);
        String sourceSha = getJson(refPath, token).path("object").path("sha").asText("");
        send("POST", repoBase(owner, repo) + "/git/refs", token, payloads.createRefPayload(branchName, sourceSha));
        return new GitBranchDto(branchName, sourceSha, branchName.equals(defaultBranch), false);
    }

    @Override
    public void deleteBranch(String token, String owner, String repo, String branchName) {
        send("DELETE", repoBase(owner, repo) + "/git/refs/heads/" + payloads.encodePath(branchName), token, null);
    }

    @Override
    public List<GitTreeEntryDto> listDirectory(String token, String owner, String repo, String branch, String path) {
        String encoded = payloads.encodePath(path);
        String suffix = encoded.isEmpty() ? "/contents" : "/contents/" + encoded;
        return parser.parseTreeEntries(getJson(repoBase(owner, repo) + suffix + "?ref=" + payloads.encodeSegment(branch), token));
    }

    @Override
    public GitFileContentDto getFileContent(String token, String owner, String repo, String branch, String path) {
        String url = repoBase(owner, repo) + "/contents/" + payloads.encodePath(path) + "?ref=" + payloads.encodeSegment(branch);
        return parser.parseFileContent(getJson(url, token), branch);
    }

    @Override
    public GitMutationResultDto upsertFile(String token, String owner, String repo, UpsertGitFileRequest req) {
        String url = repoBase(owner, repo) + "/contents/" + payloads.encodePath(req.path());
        return parser.parseMutationResult(parseJson(send("PUT", url, token, payloads.upsertFilePayload(req)).body()), req.branch(), req.content());
    }

    @Override
    public GitMutationResultDto deleteFile(String token, String owner, String repo, DeleteGitFileRequest req) {
        String url = repoBase(owner, repo) + "/contents/" + payloads.encodePath(req.path());
        return parser.parseMutationResult(parseJson(send("DELETE", url, token, payloads.deleteFilePayload(req)).body()), req.branch(), null);
    }

    @Override
    public List<GitCommitDto> listCommits(String token, String owner, String repo, String branch, int limit) {
        int clamped = Math.max(1, Math.min(limit, 100));
        return parser.parseCommits(getJson(repoBase(owner, repo) + "/commits?sha=" + payloads.encodeSegment(branch) + "&per_page=" + clamped, token));
    }

    @Override
    public GitCommitDetailDto getCommitDetail(String token, String owner, String repo, String sha) {
        return parser.parseCommitDetail(getJson(repoBase(owner, repo) + "/commits/" + payloads.encodeSegment(sha), token));
    }

    @Override
    public List<GitPullRequestDto> listPullRequests(String token, String owner, String repo, String state) {
        String safeState = (state == null || state.isBlank()) ? "all" : state.trim().toLowerCase();
        return parser.parsePullRequests(getJson(repoBase(owner, repo) + "/pulls?state=" + payloads.encodeSegment(safeState) + "&per_page=50", token));
    }

    @Override
    public GitPullRequestDto createPullRequest(String token, String owner, String repo, CreateGitPullRequest req) {
        JsonNode json = parseJson(send("POST", repoBase(owner, repo) + "/pulls", token, payloads.createPullRequestPayload(req)).body());
        return parser.parsePullRequest(json);
    }

    @Override
    public GitPullRequestDto mergePullRequest(
        String token, String owner, String repo, int pullNumber, MergeGitPullRequest req
    ) {
        String base = repoBase(owner, repo) + "/pulls/" + pullNumber;
        send("PUT", base + "/merge", token, payloads.mergePullRequestPayload(req));
        return parser.parsePullRequest(getJson(base, token));
    }

    private String repoBase(String owner, String repo) {
        return "/repos/" + payloads.encodeSegment(owner) + "/" + payloads.encodeSegment(repo);
    }

    private JsonNode getJson(String path, String token) {
        return parseJson(send("GET", path, token, null).body());
    }

    private HttpResponse<String> send(String method, String path, String token, String body) {
        String baseUrl = properties.getGithubApiUrl().replaceAll("/+$", "");
        HttpRequest.Builder req = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + path))
            .timeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds()))
            .header("Authorization", "Bearer " + token)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "Orbit-Git-Client");
        if (body != null) {
            req.header("Content-Type", "application/json").method(method, HttpRequest.BodyPublishers.ofString(body));
        } else {
            req.method(method, HttpRequest.BodyPublishers.noBody());
        }
        try {
            HttpResponse<String> resp = httpClient.send(req.build(), HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 400) throw mapGitHubError(resp.statusCode(), resp.body());
            return resp;
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.BAD_GATEWAY, "GITHUB_API_ERROR", "GitHub API request failed: " + ex.getMessage());
        }
    }

    private ApiException mapGitHubError(int status, String body) {
        String detail = extractMessage(body);
        if (status == 401 || status == 403) {
            return new ApiException(HttpStatus.BAD_GATEWAY, "GITHUB_AUTH_FAILED", "GitHub authentication failed: " + detail);
        }
        if (status == 404) return ApiException.notFound("GITHUB_RESOURCE_NOT_FOUND", "GitHub resource not found: " + detail);
        if (status == 409 || status == 422) return ApiException.conflict("GITHUB_CONFLICT", "GitHub conflict: " + detail);
        return new ApiException(HttpStatus.BAD_GATEWAY, "GITHUB_API_ERROR", "GitHub API status " + status + ": " + detail);
    }

    private String extractMessage(String body) {
        if (body == null || body.isBlank()) return "No error details returned.";
        try {
            String msg = mapper.readTree(body).path("message").asText("");
            return msg.isBlank() ? body : msg;
        } catch (IOException ex) {
            return body;
        }
    }

    private JsonNode parseJson(String body) {
        try {
            return (body == null || body.isBlank()) ? mapper.createObjectNode() : mapper.readTree(body);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "GITHUB_API_ERROR", "Invalid JSON response from GitHub.");
        }
    }
}
