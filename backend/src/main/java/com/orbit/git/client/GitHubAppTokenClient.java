package com.orbit.git.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.common.ApiException;
import com.orbit.git.config.GitProperties;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Signs GitHub App RS256 JWTs and exchanges installation IDs for scoped repository access tokens. */
@Component
public class GitHubAppTokenClient {

    private final GitProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient httpClient;

    public GitHubAppTokenClient(GitProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds()))
            .build();
    }

    public String createInstallationToken(long installationId) {
        if (!properties.isGitHubAppConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "GITHUB_APP_NOT_CONFIGURED",
                "GitHub App is not configured on this server.");
        }
        String appJwt = signAppJwt(properties.getGithubAppId().trim(), properties.getGithubAppPrivateKeyPem());
        String baseUrl = properties.getGithubApiUrl().replaceAll("/+$", "");
        String url = baseUrl + "/app/installations/" + installationId + "/access_tokens";
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds()))
            .header("Authorization", "Bearer " + appJwt)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "Orbit-Git-Client")
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();
        try {
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 400) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "GITHUB_APP_TOKEN_ERROR",
                    "GitHub App token exchange failed with status " + resp.statusCode());
            }
            JsonNode json = mapper.readTree(resp.body());
            String token = json.path("token").asText("");
            if (token.isBlank()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "GITHUB_APP_TOKEN_ERROR",
                    "GitHub App did not return an installation token.");
            }
            return token;
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.BAD_GATEWAY, "GITHUB_APP_TOKEN_ERROR",
                "GitHub App token exchange failed: " + ex.getMessage());
        }
    }

    static String signAppJwt(String appId, String pem) {
        try {
            long now = Instant.now().getEpochSecond();
            String header = base64Url("{\"alg\":\"RS256\",\"typ\":\"JWT\"}");
            String payload = base64Url("{\"iat\":" + (now - 60) + ",\"exp\":" + (now + 540) + ",\"iss\":\"" + appId + "\"}");
            String signingInput = header + "." + payload;
            PrivateKey key = parsePkcs8(pem);
            Signature sig = Signature.getInstance("SHA256withRSA");
            sig.initSign(key);
            sig.update(signingInput.getBytes(StandardCharsets.UTF_8));
            String signature = Base64.getUrlEncoder().withoutPadding().encodeToString(sig.sign());
            return signingInput + "." + signature;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_APP_JWT_ERROR",
                "Failed to sign GitHub App JWT: " + ex.getMessage());
        }
    }

    private static PrivateKey parsePkcs8(String pem) throws Exception {
        String clean = pem.replace("\\n", "\n")
            .replaceAll("-----BEGIN [A-Z ]+-----", "")
            .replaceAll("-----END [A-Z ]+-----", "")
            .replaceAll("\\s+", "");
        byte[] der = Base64.getDecoder().decode(clean);
        return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));
    }

    private static String base64Url(String raw) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }
}
