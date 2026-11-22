package com.orbit.git;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.auth.security.OAuth2FailureHandler;
import com.orbit.auth.security.OAuth2SuccessHandler;
import com.orbit.auth.service.OAuthUserProvisioningService;
import com.orbit.auth.service.RedisSessionService;
import com.orbit.common.ApiException;
import com.orbit.git.config.GitProperties;
import com.orbit.git.controller.GitOAuthController;
import com.orbit.git.dto.GitOAuthExchangeRequest;
import com.orbit.git.dto.GitOAuthStartResponse;
import com.orbit.git.dto.GitOAuthTokenResponse;
import com.orbit.git.service.GitOAuthTokenStore;
import com.orbit.git.service.GitTokenCrypto;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

class GitOAuthControllerAndHandlersTest {

    private static GitOAuthTokenStore createStore() {
        GitProperties props = new GitProperties();
        props.setEncryptionSecret("git-oauth-controller-test-secret-2026");
        return new GitOAuthTokenStore(null, new GitTokenCrypto(props));
    }

    @Test
    void startAuthorizeAndExchangeWorkEndToEnd() throws Exception {
        GitOAuthTokenStore store = createStore();
        GitOAuthController controller = new GitOAuthController(
            store, "http://localhost:5173", "real-client-id", "real-client-secret"
        );
        UUID userId = UUID.randomUUID();
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(userId, "dev@orbit.io", "dev", "jti-1");

        GitOAuthStartResponse start = controller.startOAuth(principal).getBody();
        assertNotNull(start);
        assertTrue(start.authorizeUrl().startsWith("/api/v1/git/oauth/authorize?token="));
        String startToken = start.authorizeUrl().substring(start.authorizeUrl().indexOf("token=") + 6);

        MockHttpServletRequest authReq = new MockHttpServletRequest();
        MockHttpServletResponse authRes = new MockHttpServletResponse();
        controller.authorize(startToken, authReq, authRes);
        assertEquals("/oauth2/authorization/github", authRes.getRedirectedUrl());
        assertEquals(userId.toString(), authReq.getSession(false).getAttribute(GitOAuthTokenStore.SESSION_USER_ID_ATTR));

        String code = store.createExchangeCode(userId, "gho_auto_fetched_token_123");
        GitOAuthTokenResponse exchanged = controller.exchangeCode(principal, new GitOAuthExchangeRequest(code)).getBody();
        assertNotNull(exchanged);
        assertEquals("gho_auto_fetched_token_123", exchanged.accessToken());

        ApiException replayEx = assertThrows(
            ApiException.class,
            () -> controller.exchangeCode(principal, new GitOAuthExchangeRequest(code))
        );
        assertEquals(HttpStatus.BAD_REQUEST, replayEx.getStatus());
        assertEquals("INVALID_GIT_OAUTH_CODE", replayEx.getCode());
    }

    @Test
    void startRejectsPlaceholderCredentialsAndAuthorizeHandlesInvalidToken() throws Exception {
        GitOAuthTokenStore store = createStore();
        GitOAuthController unconfigured = new GitOAuthController(
            store, "http://localhost:5173", "placeholder-github-client-id", "placeholder-github-client-secret"
        );
        AuthenticatedUserPrincipal principal =
            new AuthenticatedUserPrincipal(UUID.randomUUID(), "dev@orbit.io", "dev", "jti-2");

        ApiException ex = assertThrows(ApiException.class, () -> unconfigured.startOAuth(principal));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertEquals("GITHUB_OAUTH_NOT_CONFIGURED", ex.getCode());

        MockHttpServletResponse res = new MockHttpServletResponse();
        unconfigured.authorize("invalid-token", new MockHttpServletRequest(), res);
        assertNotNull(res.getRedirectedUrl());
        assertTrue(res.getRedirectedUrl().contains("git_oauth_error="));
    }

    @Test
    void oauthSuccessAndFailureHandlersSupportGitTokenFlowWithoutLeakingRawTokenInUrl() throws Exception {
        GitOAuthTokenStore store = createStore();
        OAuth2AuthorizedClientService clientService = mock(OAuth2AuthorizedClientService.class);
        @SuppressWarnings("unchecked")
        ObjectProvider<OAuth2AuthorizedClientService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(clientService);

        ClientRegistration reg = ClientRegistration.withRegistrationId("github")
            .clientId("cid").clientSecret("csec")
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
            .authorizationUri("https://github.com/login/oauth/authorize")
            .tokenUri("https://github.com/login/oauth/access_token")
            .userInfoUri("https://api.github.com/user")
            .userNameAttributeName("id")
            .build();
        OAuth2AccessToken accessToken = new OAuth2AccessToken(
            OAuth2AccessToken.TokenType.BEARER, "gho_never_in_url_secret", Instant.now(), Instant.now().plusSeconds(3600)
        );
        OAuth2AuthorizedClient authorizedClient = new OAuth2AuthorizedClient(reg, "12345", accessToken);
        when(clientService.loadAuthorizedClient("github", "12345")).thenReturn(authorizedClient);

        OAuth2SuccessHandler successHandler = new OAuth2SuccessHandler(
            mock(OAuthUserProvisioningService.class),
            mock(RedisSessionService.class),
            "http://localhost:5173",
            provider,
            store
        );

        UUID userId = UUID.randomUUID();
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.getSession(true).setAttribute(GitOAuthTokenStore.SESSION_USER_ID_ATTR, userId.toString());
        MockHttpServletResponse res = new MockHttpServletResponse();
        DefaultOAuth2User oauthUser = new DefaultOAuth2User(List.of(), Map.of("id", "12345"), "id");
        OAuth2AuthenticationToken auth = new OAuth2AuthenticationToken(oauthUser, List.of(), "github");

        successHandler.onAuthenticationSuccess(req, res, auth);
        String redirect = res.getRedirectedUrl();
        assertNotNull(redirect);
        assertTrue(redirect.contains("git_oauth_code="));
        assertFalse(redirect.contains("gho_never_in_url_secret"), "Raw token must never appear in redirect URL");
        assertNull(req.getSession(false).getAttribute(GitOAuthTokenStore.SESSION_USER_ID_ATTR));

        String code = redirect.substring(redirect.indexOf("git_oauth_code=") + "git_oauth_code=".length());
        assertEquals("gho_never_in_url_secret", store.consumeExchangeCode(code, userId).orElseThrow());

        OAuth2FailureHandler failureHandler = new OAuth2FailureHandler("http://localhost:5173");
        MockHttpServletRequest failReq = new MockHttpServletRequest();
        failReq.getSession(true).setAttribute(GitOAuthTokenStore.SESSION_USER_ID_ATTR, userId.toString());
        MockHttpServletResponse failRes = new MockHttpServletResponse();
        failureHandler.onAuthenticationFailure(failReq, failRes, new BadCredentialsException("Access denied"));
        assertTrue(failRes.getRedirectedUrl().contains("git_oauth_error=Access"));
        assertNull(failReq.getSession(false).getAttribute(GitOAuthTokenStore.SESSION_USER_ID_ATTR));
    }
}
