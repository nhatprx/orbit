package com.orbit.auth.security;

import com.orbit.git.service.GitOAuthTokenStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Set;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

/** Upgrades GitHub OAuth scopes to include repo access when started from the Git auto-fetch flow. */
public class GitAwareOAuth2AuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    static final Set<String> GIT_REPO_SCOPES = Set.of("repo", "read:user", "user:email");
    static final Set<String> GIT_PUBLIC_SCOPES = Set.of("public_repo", "read:user", "user:email");

    private final OAuth2AuthorizationRequestResolver delegate;

    public GitAwareOAuth2AuthorizationRequestResolver(ClientRegistrationRepository registrations) {
        this(new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization"));
    }

    GitAwareOAuth2AuthorizationRequestResolver(OAuth2AuthorizationRequestResolver delegate) {
        this.delegate = delegate;
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return customize(request, delegate.resolve(request));
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        return customize(request, delegate.resolve(request, clientRegistrationId));
    }

    private OAuth2AuthorizationRequest customize(HttpServletRequest request, OAuth2AuthorizationRequest authReq) {
        if (authReq == null || !isGitHubRegistration(authReq)) {
            return authReq;
        }
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute(GitOAuthTokenStore.SESSION_USER_ID_ATTR) == null) {
            return authReq;
        }
        Object scopeMode = session.getAttribute(GitOAuthTokenStore.SESSION_SCOPE_MODE_ATTR);
        Set<String> scopes = "public".equals(scopeMode) ? GIT_PUBLIC_SCOPES : GIT_REPO_SCOPES;
        return OAuth2AuthorizationRequest.from(authReq)
            .scopes(scopes)
            .additionalParameters(params -> params.put("prompt", "select_account"))
            .build();
    }

    private static boolean isGitHubRegistration(OAuth2AuthorizationRequest authReq) {
        Object regId = authReq.getAttribute("registration_id");
        return regId != null && "github".equalsIgnoreCase(regId.toString());
    }
}
