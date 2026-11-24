package com.orbit.git.client;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.common.ApiException;
import com.orbit.git.dto.CreateGitPullRequest;
import com.orbit.git.dto.CreateGitRepoRequest;
import com.orbit.git.dto.DeleteGitFileRequest;
import com.orbit.git.dto.MergeGitPullRequest;
import com.orbit.git.dto.UpsertGitFileRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Builds JSON request bodies and encoded URL paths for GitHub REST API calls. */
@Component
public class GitHubPayloadBuilder {

    private final ObjectMapper mapper;

    public GitHubPayloadBuilder(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public String createRepositoryPayload(String name, String description, boolean privateRepo) {
        return createRepositoryPayload(new CreateGitRepoRequest(null, name, description, privateRepo, true, null, null));
    }

    public String createRepositoryPayload(CreateGitRepoRequest req) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", req.repoName().trim());
        body.put("description", req.description() != null ? req.description() : "");
        body.put("private", req.privateRepo());
        boolean hasTemplate = (req.gitignoreTemplate() != null && !req.gitignoreTemplate().isBlank())
            || (req.licenseTemplate() != null && !req.licenseTemplate().isBlank());
        body.put("auto_init", Boolean.TRUE.equals(req.autoInit()) || hasTemplate);
        if (req.gitignoreTemplate() != null && !req.gitignoreTemplate().isBlank()) {
            body.put("gitignore_template", req.gitignoreTemplate().trim());
        }
        if (req.licenseTemplate() != null && !req.licenseTemplate().isBlank()) {
            body.put("license_template", req.licenseTemplate().trim());
        }
        return toJson(body);
    }

    public String createRefPayload(String branchName, String sha) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ref", "refs/heads/" + branchName);
        body.put("sha", sha);
        return toJson(body);
    }

    public String upsertFilePayload(UpsertGitFileRequest req) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", req.commitMessage());
        String raw = req.content() != null ? req.content() : "";
        body.put("content", Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8)));
        body.put("branch", req.branch());
        if (req.sha() != null && !req.sha().isBlank()) {
            body.put("sha", req.sha().trim());
        }
        return toJson(body);
    }

    public String deleteFilePayload(DeleteGitFileRequest req) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", req.commitMessage());
        body.put("sha", req.sha());
        body.put("branch", req.branch());
        return toJson(body);
    }

    public String createPullRequestPayload(CreateGitPullRequest req) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("title", req.title());
        body.put("body", req.description() != null ? req.description() : "");
        body.put("head", req.sourceBranch());
        body.put("base", req.targetBranch());
        return toJson(body);
    }

    public String mergePullRequestPayload(MergeGitPullRequest req) {
        Map<String, Object> body = new LinkedHashMap<>();
        if (req != null && req.commitTitle() != null && !req.commitTitle().isBlank()) {
            body.put("commit_title", req.commitTitle().trim());
        }
        String method = (req != null && req.mergeMethod() != null && !req.mergeMethod().isBlank())
            ? req.mergeMethod().trim().toLowerCase()
            : "merge";
        body.put("merge_method", method);
        return toJson(body);
    }

    public String encodeSegment(String segment) {
        return URLEncoder.encode(segment, StandardCharsets.UTF_8).replace("+", "%20");
    }

    public String encodePath(String path) {
        if (path == null || path.isBlank()) {
            return "";
        }
        return Arrays.stream(path.split("/"))
            .filter(s -> !s.isBlank())
            .map(this::encodeSegment)
            .collect(Collectors.joining("/"));
    }

    private String toJson(Map<String, Object> body) {
        try {
            return mapper.writeValueAsString(body);
        } catch (JsonProcessingException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_SERIALIZE_ERROR",
                "Failed to serialize GitHub request payload.");
        }
    }
}
