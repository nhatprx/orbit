package com.orbit.git.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.orbit.git.dto.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Component;

/** Parses GitHub REST API JSON payloads into Orbit Git DTO records. */
@Component
public class GitHubApiParser {

    private static final Map<String, String> EXT_LANG = Map.ofEntries(
        Map.entry(".ts", "typescript"), Map.entry(".tsx", "tsx"),
        Map.entry(".js", "javascript"), Map.entry(".mjs", "javascript"), Map.entry(".cjs", "javascript"),
        Map.entry(".jsx", "jsx"), Map.entry(".java", "java"), Map.entry(".py", "python"),
        Map.entry(".sql", "sql"), Map.entry(".json", "json"), Map.entry(".md", "markdown"),
        Map.entry(".yml", "yaml"), Map.entry(".yaml", "yaml"),
        Map.entry(".css", "css"), Map.entry(".html", "html"), Map.entry(".htm", "html")
    );

    public List<String> parseScopes(String headerValue) {
        if (headerValue == null || headerValue.isBlank()) return List.of();
        return Arrays.stream(headerValue.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public InspectGitTokenResponse parseInspectToken(JsonNode user, List<String> scopes, JsonNode repos) {
        List<GitHubRemoteRepoDto> list = new ArrayList<>();
        if (repos != null && repos.isArray()) repos.forEach(item -> list.add(parseRemoteRepo(item)));
        return new InspectGitTokenResponse(text(user, "login", ""), nullableText(user, "name"), scopes, list);
    }

    public GitHubRemoteRepoDto parseRemoteRepo(JsonNode node) {
        String owner = text(node.path("owner"), "login", "");
        String name = text(node, "name", "");
        return new GitHubRemoteRepoDto(
            owner, name, text(node, "full_name", owner + "/" + name),
            text(node, "default_branch", "main"), node.path("private").asBoolean(true),
            text(node, "clone_url", ""), text(node, "html_url", ""), nullableText(node, "description")
        );
    }

    public List<GitBranchDto> parseBranches(JsonNode array, String defaultBranch) {
        List<GitBranchDto> result = new ArrayList<>();
        if (array != null && array.isArray()) {
            for (JsonNode item : array) {
                String name = text(item, "name", "");
                result.add(new GitBranchDto(name, text(item.path("commit"), "sha", ""),
                    name.equals(defaultBranch), item.path("protected").asBoolean(false)));
            }
        }
        result.sort(Comparator.comparing(GitBranchDto::isDefault).reversed()
            .thenComparing(GitBranchDto::name, String.CASE_INSENSITIVE_ORDER));
        return result;
    }

    public List<GitTreeEntryDto> parseTreeEntries(JsonNode array) {
        List<GitTreeEntryDto> entries = new ArrayList<>();
        if (array != null && array.isArray()) {
            for (JsonNode item : array) {
                String type = "dir".equalsIgnoreCase(text(item, "type", "file")) ? "dir" : "file";
                entries.add(new GitTreeEntryDto(text(item, "path", ""), text(item, "name", ""), type,
                    item.path("size").asLong(0), text(item, "sha", ""), nullableText(item, "html_url")));
            }
        }
        entries.sort(Comparator.comparing((GitTreeEntryDto e) -> !"dir".equals(e.type()))
            .thenComparing(GitTreeEntryDto::name, String.CASE_INSENSITIVE_ORDER));
        return entries;
    }

    public GitFileContentDto parseFileContent(JsonNode node, String branch) {
        String name = text(node, "name", "");
        String decoded = decodeBase64(text(node, "content", ""));
        return new GitFileContentDto(
            text(node, "path", ""), name, text(node, "sha", ""),
            node.path("size").asLong(decoded.getBytes(StandardCharsets.UTF_8).length),
            branch, inferLanguage(name), decoded, nullableText(node, "html_url")
        );
    }

    public GitMutationResultDto parseMutationResult(JsonNode node, String branch, String content) {
        JsonNode cNode = node.path("content");
        GitFileContentDto file = null;
        if (cNode.isObject()) {
            String name = text(cNode, "name", "");
            String safe = content != null ? content : "";
            file = new GitFileContentDto(text(cNode, "path", ""), name, text(cNode, "sha", ""),
                cNode.path("size").asLong(safe.getBytes(StandardCharsets.UTF_8).length),
                branch, inferLanguage(name), safe, nullableText(cNode, "html_url"));
        }
        JsonNode commit = node.path("commit");
        JsonNode author = commit.path("author");
        GitCommitDto commitDto = new GitCommitDto(
            text(commit, "sha", ""), text(commit, "message", ""), text(author, "name", "unknown"),
            nullableText(author, "email"), parseInstant(text(author, "date", null)),
            1, 0, 0, nullableText(commit, "html_url"));
        return new GitMutationResultDto(file, commitDto);
    }

    public List<GitCommitDto> parseCommits(JsonNode array) {
        List<GitCommitDto> commits = new ArrayList<>();
        if (array != null && array.isArray()) {
            for (JsonNode item : array) {
                JsonNode c = item.path("commit");
                JsonNode author = c.path("author");
                JsonNode stats = item.path("stats");
                int files = item.path("files").isArray() ? item.path("files").size() : 0;
                commits.add(new GitCommitDto(text(item, "sha", ""), text(c, "message", ""),
                    text(author, "name", text(item.path("author"), "login", "unknown")),
                    nullableText(author, "email"), parseInstant(text(author, "date", null)),
                    files, stats.path("additions").asInt(0), stats.path("deletions").asInt(0),
                    nullableText(item, "html_url")));
            }
        }
        return commits;
    }

    public GitCommitDetailDto parseCommitDetail(JsonNode node) {
        JsonNode c = node.path("commit");
        JsonNode author = c.path("author");
        JsonNode stats = node.path("stats");
        List<GitCommitFileDiffDto> files = new ArrayList<>();
        if (node.path("files").isArray()) {
            for (JsonNode f : node.path("files")) {
                files.add(new GitCommitFileDiffDto(text(f, "filename", ""), text(f, "status", "modified"),
                    f.path("additions").asInt(0), f.path("deletions").asInt(0),
                    f.path("changes").asInt(0), nullableText(f, "patch")));
            }
        }
        return new GitCommitDetailDto(text(node, "sha", ""), text(c, "message", ""),
            text(author, "name", text(node.path("author"), "login", "unknown")),
            nullableText(author, "email"), parseInstant(text(author, "date", null)),
            stats.path("additions").asInt(0), stats.path("deletions").asInt(0), files, nullableText(node, "html_url"));
    }

    public List<GitPullRequestDto> parsePullRequests(JsonNode array) {
        List<GitPullRequestDto> prs = new ArrayList<>();
        if (array != null && array.isArray()) array.forEach(item -> prs.add(parsePullRequest(item)));
        return prs;
    }

    public GitPullRequestDto parsePullRequest(JsonNode node) {
        String mergedAt = nullableText(node, "merged_at");
        String status = (mergedAt != null && !mergedAt.isBlank())
            ? "merged" : text(node, "state", "open").toLowerCase(Locale.ROOT);
        return new GitPullRequestDto(
            node.path("number").asInt(0), text(node, "title", ""), nullableText(node, "body"),
            text(node.path("user"), "login", "unknown"), text(node.path("head"), "ref", ""),
            text(node.path("base"), "ref", ""), status,
            parseInstant(text(node, "updated_at", null)), nullableText(node, "html_url"));
    }

    public static String inferLanguage(String filename) {
        if (filename == null || !filename.contains(".")) return "text";
        String ext = filename.substring(filename.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        return EXT_LANG.getOrDefault(ext, "text");
    }

    private static String decodeBase64(String encoded) {
        if (encoded == null || encoded.isBlank()) return "";
        return new String(Base64.getDecoder().decode(encoded.replaceAll("\\s+", "")), StandardCharsets.UTF_8);
    }

    private static Instant parseInstant(String iso) {
        return (iso == null || iso.isBlank()) ? Instant.now() : Instant.parse(iso);
    }

    private static String text(JsonNode node, String field, String fallback) {
        JsonNode v = node.path(field);
        return (v.isMissingNode() || v.isNull()) ? fallback : v.asText(fallback);
    }

    private static String nullableText(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return (v.isMissingNode() || v.isNull()) ? null : v.asText();
    }
}
