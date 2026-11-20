package com.orbit.auth.controller;

import com.orbit.auth.dto.LinkedAccountDto;
import com.orbit.auth.dto.OAuthLinkStartResponse;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.auth.security.OAuth2SuccessHandler;
import com.orbit.auth.service.AuthEphemeralStore;
import com.orbit.auth.service.AuthEphemeralStore.OAuthLinkIntent;
import com.orbit.auth.service.LinkedAccountService;
import com.orbit.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/v1/auth")
public class LinkedAccountController {

    private final LinkedAccountService linkedAccountService;
    private final AuthEphemeralStore ephemeralStore;
    private final String frontendUrl;

    public LinkedAccountController(
        LinkedAccountService linkedAccountService,
        AuthEphemeralStore ephemeralStore,
        @Value("${orbit.frontend.url:http://localhost:5173}") String frontendUrl
    ) {
        this.linkedAccountService = linkedAccountService;
        this.ephemeralStore = ephemeralStore;
        this.frontendUrl = frontendUrl;
    }

    @GetMapping("/linked-accounts")
    public ResponseEntity<List<LinkedAccountDto>> listLinkedAccounts(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ResponseEntity.ok(linkedAccountService.listLinkedAccounts(requireUser(principal)));
    }

    @PostMapping("/linked-accounts/{provider}/link-token")
    public ResponseEntity<OAuthLinkStartResponse> createLinkToken(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String provider
    ) {
        return ResponseEntity.ok(linkedAccountService.createLinkStart(requireUser(principal), provider));
    }

    @DeleteMapping("/linked-accounts/{accountId}")
    public ResponseEntity<Void> disconnectAccount(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID accountId
    ) {
        linkedAccountService.disconnectAccount(requireUser(principal), accountId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/oauth/link/{provider}")
    public void startOAuthLink(
        @PathVariable String provider,
        @RequestParam(name = "token", required = false) String token,
        HttpServletRequest request,
        HttpServletResponse response
    ) throws IOException {
        String normalized;
        try {
            normalized = LinkedAccountService.normalizeProvider(provider);
        } catch (ApiException ex) {
            redirectLinkError(response, ex.getMessage());
            return;
        }

        Optional<OAuthLinkIntent> intent = ephemeralStore.consumeOAuthLinkToken(token);
        if (intent.isEmpty() || !normalized.equals(intent.get().provider())) {
            redirectLinkError(response, "Account link session expired. Please try again.");
            return;
        }

        HttpSession session = request.getSession(true);
        session.setAttribute(OAuth2SuccessHandler.LINK_USER_ID_ATTR, intent.get().userId().toString());
        session.setAttribute(OAuth2SuccessHandler.LINK_PROVIDER_ATTR, normalized);
        response.sendRedirect("/oauth2/authorization/" + normalized);
    }

    private void redirectLinkError(HttpServletResponse response, String message) throws IOException {
        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl)
            .queryParam("oauth_link_error", message)
            .build()
            .encode()
            .toUriString();
        response.sendRedirect(targetUrl);
    }

    private UUID requireUser(AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        }
        return principal.userId();
    }
}
