package com.orbit.git;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.orbit.auth.security.GitAwareOAuth2AuthorizationRequestResolver;
import com.orbit.git.config.GitProperties;
import com.orbit.git.service.GitOAuthTokenStore;
import com.orbit.git.service.GitTokenCrypto;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

class GitOAuthTokenStoreAndResolverTest {

    private static GitTokenCrypto crypto() {
        GitProperties props = new GitProperties();
        props.setEncryptionSecret("test-secret-for-git-oauth-store-unit-tests-2026");
        return new GitTokenCrypto(props);
    }

    @Test
    void startTokenIsSingleUseAndExpires() {
        AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-11-22T07:00:00Z"));
        Clock clock = new Clock() {
            @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(java.time.ZoneId zone) { return this; }
            @Override public Instant instant() { return now.get(); }
        };
        GitOAuthTokenStore store = new GitOAuthTokenStore(null, crypto(), clock);
        UUID userId = UUID.randomUUID();

        String token = store.createStartToken(userId);
        assertEquals(userId, store.consumeStartToken(token).orElseThrow());
        assertTrue(store.consumeStartToken(token).isEmpty(), "Start token must be single-use");
        assertTrue(store.consumeStartToken("   ").isEmpty());
        assertTrue(store.consumeStartToken(null).isEmpty());

        String expiring = store.createStartToken(userId);
        now.set(now.get().plusSeconds(301));
        assertTrue(store.consumeStartToken(expiring).isEmpty(), "Expired start token must not be accepted");
    }

    @Test
    void exchangeCodeIsEncryptedUserBoundSingleUseAndExpires() {
        AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-11-22T07:00:00Z"));
        Clock clock = new Clock() {
            @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(java.time.ZoneId zone) { return this; }
            @Override public Instant instant() { return now.get(); }
        };
        GitOAuthTokenStore store = new GitOAuthTokenStore(null, crypto(), clock);
        UUID ownerId = UUID.randomUUID();
        UUID attackerId = UUID.randomUUID();

        String code = store.createExchangeCode(ownerId, "gho_secret_token_987654321");
        assertEquals("gho_secret_token_987654321", store.consumeExchangeCode(code, ownerId).orElseThrow());
        assertTrue(store.consumeExchangeCode(code, ownerId).isEmpty(), "Exchange code must be single-use");

        String otherCode = store.createExchangeCode(ownerId, "gho_owner_only_token");
        assertTrue(store.consumeExchangeCode(otherCode, attackerId).isEmpty(), "Wrong user must not redeem code");
        assertTrue(store.consumeExchangeCode(otherCode, ownerId).isEmpty(), "Code is consumed on mismatch");

        String expiredCode = store.createExchangeCode(ownerId, "gho_expiring_token");
        now.set(now.get().plusSeconds(61));
        assertTrue(store.consumeExchangeCode(expiredCode, ownerId).isEmpty(), "Expired code must be rejected");

        assertThrows(IllegalArgumentException.class, () -> store.createExchangeCode(ownerId, "  "));
    }

    @Test
    void resolverAddsRepoScopeOnlyForGitHubGitTokenFlow() {
        ClientRegistration github = ClientRegistration.withRegistrationId("github")
            .clientId("cid").clientSecret("csec")
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
            .scope("read:user", "user:email")
            .authorizationUri("https://github.com/login/oauth/authorize")
            .tokenUri("https://github.com/login/oauth/access_token")
            .userInfoUri("https://api.github.com/user")
            .userNameAttributeName("id")
            .build();
        ClientRegistration google = ClientRegistration.withRegistrationId("google")
            .clientId("gid").clientSecret("gsec")
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
            .scope("openid", "email")
            .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
            .tokenUri("https://oauth2.googleapis.com/token")
            .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
            .userNameAttributeName("sub")
            .build();

        GitAwareOAuth2AuthorizationRequestResolver resolver =
            new GitAwareOAuth2AuthorizationRequestResolver(new InMemoryClientRegistrationRepository(github, google));

        MockHttpServletRequest normalReq = new MockHttpServletRequest("GET", "/oauth2/authorization/github");
        normalReq.setServletPath("/oauth2/authorization/github");
        OAuth2AuthorizationRequest normalAuth = resolver.resolve(normalReq);
        assertNotNull(normalAuth);
        assertFalse(normalAuth.getScopes().contains("repo"));

        MockHttpServletRequest gitReq = new MockHttpServletRequest("GET", "/oauth2/authorization/github");
        gitReq.setServletPath("/oauth2/authorization/github");
        gitReq.getSession(true).setAttribute(GitOAuthTokenStore.SESSION_USER_ID_ATTR, UUID.randomUUID().toString());
        OAuth2AuthorizationRequest gitAuth = resolver.resolve(gitReq);
        assertNotNull(gitAuth);
        assertEquals(Set.of("repo", "read:user", "user:email"), gitAuth.getScopes());
        assertTrue(gitAuth.getRedirectUri().endsWith("/login/oauth2/code/github"));

        MockHttpServletRequest googleReq = new MockHttpServletRequest("GET", "/oauth2/authorization/google");
        googleReq.setServletPath("/oauth2/authorization/google");
        googleReq.getSession(true).setAttribute(GitOAuthTokenStore.SESSION_USER_ID_ATTR, UUID.randomUUID().toString());
        OAuth2AuthorizationRequest googleAuth = resolver.resolve(googleReq);
        assertNotNull(googleAuth);
        assertFalse(googleAuth.getScopes().contains("repo"));
        assertNotNull(Map.of("ok", true));
    }
}
