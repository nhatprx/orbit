package com.orbit.git.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.ApiException;
import com.orbit.git.client.GitHubAppTokenClient;
import com.orbit.git.config.GitProperties;
import com.orbit.git.dto.GitOAuthExchangeRequest;
import com.orbit.git.dto.GitOAuthStartResponse;
import com.orbit.git.dto.GitOAuthTokenResponse;
import com.orbit.git.service.GitOAuthTokenStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

/** Starts and exchanges short-lived GitHub OAuth and GitHub App popup sessions. */
@RestController
@RequestMapping("/api/v1/git/oauth")
public class GitOAuthController {

    private final GitOAuthTokenStore tokenStore;
    private final String frontendUrl;
    private final String githubClientId;
    private final String githubClientSecret;
    private final GitProperties gitProperties;
    private final GitHubAppTokenClient appTokenClient;

    public GitOAuthController(
        GitOAuthTokenStore tokenStore,
        String frontendUrl,
        String githubClientId,
        String githubClientSecret
    ) {
        this(tokenStore, frontendUrl, githubClientId, githubClientSecret, null, null);
    }

    @Autowired
    public GitOAuthController(
        GitOAuthTokenStore tokenStore,
        @Value("${orbit.frontend.url:http://localhost:5173}") String frontendUrl,
        @Value("${spring.security.oauth2.client.registration.github.client-id:}") String githubClientId,
        @Value("${spring.security.oauth2.client.registration.github.client-secret:}") String githubClientSecret,
        GitProperties gitProperties,
        GitHubAppTokenClient appTokenClient
    ) {
        this.tokenStore = tokenStore;
        this.frontendUrl = frontendUrl;
        this.githubClientId = githubClientId;
        this.githubClientSecret = githubClientSecret;
        this.gitProperties = gitProperties;
        this.appTokenClient = appTokenClient;
    }

    @GetMapping("/capabilities")
    public Map<String, Object> capabilities() {
        boolean appReady = gitProperties != null && gitProperties.isGitHubAppConfigured();
        String slug = appReady ? gitProperties.getGithubAppSlug().trim() : "";
        return Map.of(
            "oauthConfigured", isGitHubOAuthConfigured(),
            "githubAppConfigured", appReady,
            "githubAppSlug", slug
        );
    }

    public ResponseEntity<GitOAuthStartResponse> startOAuth(AuthenticatedUserPrincipal principal) {
        return startOAuth(principal, "all");
    }

    @PostMapping("/start")
    public ResponseEntity<GitOAuthStartResponse> startOAuth(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(name = "scopeMode", required = false, defaultValue = "all") String scopeMode
    ) {
        UUID userId = requireUser(principal);
        String mode = normalizeScopeMode(scopeMode);
        if ("selected".equals(mode)) {
            if (gitProperties == null || !gitProperties.isGitHubAppConfigured()) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "GITHUB_APP_NOT_CONFIGURED",
                    "GitHub App is not configured for selected-repository access.");
            }
            String token = tokenStore.createStartToken(userId);
            String slug = gitProperties.getGithubAppSlug().trim();
            return ResponseEntity.ok(new GitOAuthStartResponse(
                "https://github.com/apps/" + slug + "/installations/new?state=" + token
            ));
        }
        if (!isGitHubOAuthConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "GITHUB_OAUTH_NOT_CONFIGURED",
                "GitHub OAuth is not configured on this server.");
        }
        String token = tokenStore.createStartToken(userId);
        String url = "public".equals(mode)
            ? "/api/v1/git/oauth/authorize?token=" + token + "&scopeMode=public"
            : "/api/v1/git/oauth/authorize?token=" + token;
        return ResponseEntity.ok(new GitOAuthStartResponse(url));
    }

    public void authorize(String token, HttpServletRequest request, HttpServletResponse response) throws IOException {
        authorize(token, "all", request, response);
    }

    @GetMapping("/authorize")
    public void authorize(
        @RequestParam(name = "token", required = false) String token,
        @RequestParam(name = "scopeMode", required = false, defaultValue = "all") String scopeMode,
        HttpServletRequest request,
        HttpServletResponse response
    ) throws IOException {
        Optional<UUID> userId = tokenStore.consumeStartToken(token);
        if (userId.isEmpty()) {
            redirectError(response, "GitHub authorization session expired. Please try again.");
            return;
        }
        HttpSession session = request.getSession(true);
        session.setAttribute(GitOAuthTokenStore.SESSION_USER_ID_ATTR, userId.get().toString());
        session.setAttribute(GitOAuthTokenStore.SESSION_SCOPE_MODE_ATTR, normalizeScopeMode(scopeMode));
        response.sendRedirect("/oauth2/authorization/github");
    }

    @GetMapping("/app-callback")
    public void appCallback(
        @RequestParam(name = "installation_id", required = false) Long installationId,
        @RequestParam(name = "state", required = false) String state,
        HttpServletResponse response
    ) throws IOException {
        Optional<UUID> userId = tokenStore.consumeStartToken(state);
        if (userId.isEmpty() || installationId == null || appTokenClient == null) {
            redirectError(response, "GitHub App installation session expired. Please try again.");
            return;
        }
        try {
            String installToken = appTokenClient.createInstallationToken(installationId);
            String code = tokenStore.createExchangeCode(userId.get(), installToken);
            String target = UriComponentsBuilder.fromUriString(frontendUrl)
                .queryParam("git_oauth_code", code).build().encode().toUriString();
            response.sendRedirect(target);
        } catch (Exception ex) {
            redirectError(response, "GitHub App authorization failed: " + ex.getMessage());
        }
    }

    @PostMapping("/exchange")
    public ResponseEntity<GitOAuthTokenResponse> exchangeCode(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestBody(required = false) GitOAuthExchangeRequest request
    ) {
        UUID userId = requireUser(principal);
        String code = request != null ? request.code() : null;
        if (code == null || code.isBlank()) {
            throw ApiException.badRequest("INVALID_GIT_OAUTH_CODE", "GitHub authorization code is required.");
        }
        String accessToken = tokenStore.consumeExchangeCode(code, userId)
            .orElseThrow(() -> ApiException.badRequest(
                "INVALID_GIT_OAUTH_CODE", "GitHub authorization code is invalid or expired. Please try again."
            ));
        return ResponseEntity.ok(new GitOAuthTokenResponse(accessToken));
    }

    private static String normalizeScopeMode(String raw) {
        if (raw == null) return "all";
        String lower = raw.trim().toLowerCase();
        if ("public".equals(lower) || "selected".equals(lower)) return lower;
        return "all";
    }

    private boolean isGitHubOAuthConfigured() {
        return isRealCredential(githubClientId) && isRealCredential(githubClientSecret);
    }

    private static boolean isRealCredential(String value) {
        if (value == null || value.isBlank()) return false;
        String trimmed = value.trim().toLowerCase();
        return !trimmed.startsWith("placeholder-") && !trimmed.startsWith("replace-");
    }

    private void redirectError(HttpServletResponse response, String message) throws IOException {
        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl)
            .queryParam("git_oauth_error", message).build().encode().toUriString();
        response.sendRedirect(targetUrl);
    }

    private static UUID requireUser(AuthenticatedUserPrincipal principal) {
        if (principal == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        return principal.userId();
    }
}
