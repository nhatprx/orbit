package com.orbit.git;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.common.ApiException;
import com.orbit.git.client.GitHubApiParser;
import com.orbit.git.client.GitHubPayloadBuilder;
import com.orbit.git.client.HttpGitHubClient;
import com.orbit.git.config.GitProperties;
import com.orbit.git.dto.*;
import com.orbit.git.service.GitTokenCrypto;
import com.sun.net.httpserver.HttpServer;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class GitTokenCryptoAndParserTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final GitHubApiParser parser = new GitHubApiParser();
    private final GitHubPayloadBuilder payloads = new GitHubPayloadBuilder(mapper);

    @Test
    void tokenCryptoRoundTripUniqueIvAndMasking() {
        GitProperties props = new GitProperties();
        props.setEncryptionSecret("unit-test-encryption-secret-key-2026");
        GitTokenCrypto crypto = new GitTokenCrypto(props);

        String raw = "ghp_1234567890abcdef1234567890abcd";
        String enc1 = crypto.encrypt(raw);
        String enc2 = crypto.encrypt(raw);
        assertNotEquals(enc1, enc2);
        assertEquals(raw, crypto.decrypt(enc1));
        assertEquals(raw, crypto.decrypt(enc2));
        assertEquals("ghp_...abcd", crypto.maskToken(raw));
        assertEquals("github_...9999", crypto.maskToken("github_pat_1111222233339999"));
        assertEquals("****", crypto.maskToken("short"));
        assertEquals("", crypto.maskToken("  "));
        assertThrows(IllegalStateException.class, () -> crypto.decrypt("not-valid-ciphertext"));
    }

    @Test
    void parserHandlesTreeSortingFileDecodeLanguageAndPrStates() throws Exception {
        var treeJson = mapper.readTree("""
            [
              {"path":"README.md","name":"README.md","type":"file","size":10,"sha":"s1"},
              {"path":"src","name":"src","type":"dir","size":0,"sha":"s2"},
              {"path":"docs","name":"docs","type":"dir","size":0,"sha":"s3"},
              {"path":"app.ts","name":"app.ts","type":"file","size":20,"sha":"s4"}
            ]
            """);
        List<GitTreeEntryDto> entries = parser.parseTreeEntries(treeJson);
        assertEquals(List.of("docs", "src", "app.ts", "README.md"),
            entries.stream().map(GitTreeEntryDto::name).toList());

        String encoded = Base64.getEncoder().encodeToString("hello\nworld".getBytes(StandardCharsets.UTF_8));
        var fileJson = mapper.readTree("""
            {"path":"src/Main.java","name":"Main.java","sha":"abc","size":11,"content":"%s\\n","html_url":"https://gh/f"}
            """.formatted(encoded));
        GitFileContentDto file = parser.parseFileContent(fileJson, "main");
        assertEquals("hello\nworld", file.content());
        assertEquals("java", file.language());
        assertEquals("typescript", GitHubApiParser.inferLanguage("index.ts"));
        assertEquals("tsx", GitHubApiParser.inferLanguage("App.tsx"));
        assertEquals("python", GitHubApiParser.inferLanguage("script.py"));
        assertEquals("sql", GitHubApiParser.inferLanguage("V12.sql"));
        assertEquals("yaml", GitHubApiParser.inferLanguage("ci.yml"));
        assertEquals("text", GitHubApiParser.inferLanguage("Makefile"));

        var prsJson = mapper.readTree("""
            [
              {"number":1,"title":"PR1","state":"open","merged_at":null,"user":{"login":"alice"},"head":{"ref":"feat"},"base":{"ref":"main"},"updated_at":"2026-01-01T00:00:00Z"},
              {"number":2,"title":"PR2","state":"closed","merged_at":"2026-01-02T00:00:00Z","user":{"login":"bob"},"head":{"ref":"fix"},"base":{"ref":"main"},"updated_at":"2026-01-02T00:00:00Z"}
            ]
            """);
        List<GitPullRequestDto> prs = parser.parsePullRequests(prsJson);
        assertEquals("open", prs.get(0).status());
        assertEquals("merged", prs.get(1).status());
    }

    @Test
    void parserHandlesCommitsDiffAndPayloadBuilderEncodesUpsert() throws Exception {
        var detailJson = mapper.readTree("""
            {
              "sha":"sha123","html_url":"https://gh/c/1",
              "commit":{"message":"init","author":{"name":"Alice","email":"a@test","date":"2026-01-01T00:00:00Z"}},
              "stats":{"additions":5,"deletions":2},
              "files":[{"filename":"a.ts","status":"modified","additions":5,"deletions":2,"changes":7,"patch":"@@ -1 +1 @@"}]
            }
            """);
        GitCommitDetailDto detail = parser.parseCommitDetail(detailJson);
        assertEquals("sha123", detail.sha());
        assertEquals(1, detail.files().size());
        assertEquals("@@ -1 +1 @@", detail.files().getFirst().patch());

        String payload = payloads.upsertFilePayload(new UpsertGitFileRequest("main", "a/b.ts", "const x=1;", "msg", "oldsha"));
        var node = mapper.readTree(payload);
        assertEquals("msg", node.path("message").asText());
        assertEquals("oldsha", node.path("sha").asText());
        assertEquals("const x=1;", new String(Base64.getDecoder().decode(node.path("content").asText()), StandardCharsets.UTF_8));
        assertEquals("src/my%20file.ts", payloads.encodePath("src/my file.ts"));
    }

    @Test
    void httpGitHubClientMapsStatusCodesAndSendsRequiredHeaders() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        try {
            server.createContext("/user", ex -> {
                String auth = ex.getRequestHeaders().getFirst("Authorization");
                String apiVer = ex.getRequestHeaders().getFirst("X-GitHub-Api-Version");
                if ("Bearer bad-token".equals(auth)) {
                    respond(ex, 401, "{\"message\":\"Bad credentials\"}");
                } else if ("2022-11-28".equals(apiVer)) {
                    ex.getResponseHeaders().add("X-OAuth-Scopes", "repo, read:user");
                    respond(ex, 200, "{\"login\":\"octocat\",\"name\":\"Octo Cat\"}");
                } else {
                    respond(ex, 500, "{\"message\":\"Missing version\"}");
                }
            });
            server.createContext("/user/repos", ex -> respond(ex, 200, "[]"));
            server.createContext("/repos/acme/missing", ex -> respond(ex, 404, "{\"message\":\"Not Found\"}"));
            server.createContext("/repos/acme/conflict/pulls", ex -> respond(ex, 422, "{\"message\":\"Validation Failed\"}"));
            server.start();

            GitProperties props = new GitProperties();
            props.setGithubApiUrl("http://127.0.0.1:" + server.getAddress().getPort());
            HttpGitHubClient client = new HttpGitHubClient(props, mapper, parser, payloads);

            InspectGitTokenResponse ok = client.inspectToken("good-token");
            assertEquals("octocat", ok.username());
            assertEquals(List.of("repo", "read:user"), ok.scopes());

            ApiException authEx = assertThrows(ApiException.class, () -> client.inspectToken("bad-token"));
            assertEquals(HttpStatus.BAD_GATEWAY, authEx.getStatus());
            assertEquals("GITHUB_AUTH_FAILED", authEx.getCode());

            ApiException notFound = assertThrows(ApiException.class, () -> client.getRepository("good-token", "acme", "missing"));
            assertEquals(HttpStatus.NOT_FOUND, notFound.getStatus());
            assertEquals("GITHUB_RESOURCE_NOT_FOUND", notFound.getCode());

            ApiException conflict = assertThrows(ApiException.class, () -> client.createPullRequest(
                "good-token", "acme", "conflict", new CreateGitPullRequest("t", "d", "feat", "main")));
            assertEquals(HttpStatus.CONFLICT, conflict.getStatus());
            assertEquals("GITHUB_CONFLICT", conflict.getCode());
        } finally {
            server.stop(0);
        }
    }

    private static void respond(com.sun.net.httpserver.HttpExchange ex, int status, String json) throws java.io.IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }
}
