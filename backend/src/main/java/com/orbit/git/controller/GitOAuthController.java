package com.orbit.git.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.ApiException;
import com.orbit.git.dto.GitOAuthExchangeRequest;
import com.orbit.git.dto.GitOAuthStartResponse;
import com.orbit.git.dto.GitOAuthTokenResponse;
import com.orbit.git.service.GitOAuthTokenStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

/** Starts and exchanges short-lived GitHub OAuth popup sessions for Git repository access tokens. */
@RestController
@RequestMapping("/api/v1/git/oauth")
public class GitOAuthController {

    private final GitOAuthTokenStore tokenStore;
    private final String frontendUrl;
    private final String githubClientId;
    private final String githubClientSecret;

    public GitOAuthController(
        GitOAuthTokenStore tokenStore,
        @Value("${orbit.frontend.url:http://localhost:5173}") String frontendUrl,
        @Value("${spring.security.oauth2.client.registration.github.client-id:}") String githubClientId,
        @Value("${spring.security.oauth2.client.registration.github.client-secret:}") String githubClientSecret
    ) {
        this.tokenStore = tokenStore;
        this.frontendUrl = frontendUrl;
        this.githubClientId = githubClientId;
        this.githubClientSecret = githubClientSecret;
    }

    @PostMapping("/start")
    public ResponseEntity<GitOAuthStartResponse> startOAuth(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        UUID userId = requireUser(principal);
        if (!isGitHubOAuthConfigured()) {
            throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "GITHUB_OAUTH_NOT_CONFIGURED",
                "GitHub OAuth is not configured on this server. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET or enter a PAT manually."
            );
        }
        String token = tokenStore.createStartToken(userId);
        return ResponseEntity.ok(new GitOAuthStartResponse("/api/v1/git/oauth/authorize?token=" + token));
    }

    @GetMapping("/authorize")
    public void authorize(
        @RequestParam(name = "token", required = false) String token,
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
        response.sendRedirect("/oauth2/authorization/github");
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
                "INVALID_GIT_OAUTH_CODE",
                "GitHub authorization code is invalid or expired. Please try again."
            ));
        return ResponseEntity.ok(new GitOAuthTokenResponse(accessToken));
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
            .queryParam("git_oauth_error", message)
            .build()
            .encode()
            .toUriString();
        response.sendRedirect(targetUrl);
    }

    private static UUID requireUser(AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        }
        return principal.userId();
    }
}
