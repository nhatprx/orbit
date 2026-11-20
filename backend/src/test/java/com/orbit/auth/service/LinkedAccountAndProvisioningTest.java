package com.orbit.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.dto.OAuthLinkStartResponse;
import com.orbit.auth.entity.OAuthAccountEntity;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.OAuthAccountRepository;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.security.OAuth2FailureHandler;
import com.orbit.auth.security.OAuth2SuccessHandler;
import com.orbit.common.ApiException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

@ExtendWith(MockitoExtension.class)
class LinkedAccountAndProvisioningTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private OAuthAccountRepository oauthAccountRepository;
    @Mock
    private StringRedisTemplate redisTemplate;

    private OAuthUserProvisioningService provisioningService;
    private AuthEphemeralStore ephemeralStore;
    private LinkedAccountService linkedAccountService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis offline"));
        provisioningService = new OAuthUserProvisioningService(userRepository, oauthAccountRepository);
        ephemeralStore = new AuthEphemeralStore(redisTemplate);
        linkedAccountService = new LinkedAccountService(userRepository, oauthAccountRepository, ephemeralStore);
    }

    @Test
    void linkingGoogleAndGithubResolvesToSameExistingUserOnFutureOAuthLogin() {
        UserEntity nhat = user("nhatprx", "nhat@orbit.dev", "hashed-pw");
        OAuth2User googleUser = oauthUser("sub", "g-100", "nhat.personal@gmail.com", "Nhat Google");
        OAuth2User githubUser = oauthUser("id", "gh-200", "nhat@users.noreply.github.com", "nhatprx-gh");

        when(userRepository.findById(nhat.getId())).thenReturn(Optional.of(nhat));
        when(oauthAccountRepository.findByProviderAndProviderUserId("google", "g-100")).thenReturn(Optional.empty());
        when(oauthAccountRepository.findByUserIdAndProvider(nhat.getId(), "google")).thenReturn(Optional.empty());
        when(oauthAccountRepository.save(any(OAuthAccountEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        OAuthAccountEntity linkedGoogle = provisioningService.linkOAuthAccount(nhat.getId(), "google", googleUser);
        assertEquals(nhat.getId(), linkedGoogle.getUser().getId());
        assertEquals("google", linkedGoogle.getProvider());

        when(oauthAccountRepository.findByProviderAndProviderUserId("google", "g-100"))
            .thenReturn(Optional.of(linkedGoogle));
        UserEntity signedInGoogle = provisioningService.provisionOAuthUser("google", googleUser);
        assertEquals(nhat.getId(), signedInGoogle.getId());

        when(oauthAccountRepository.findByProviderAndProviderUserId("github", "gh-200")).thenReturn(Optional.empty());
        when(oauthAccountRepository.findByUserIdAndProvider(nhat.getId(), "github")).thenReturn(Optional.empty());
        OAuthAccountEntity linkedGithub = provisioningService.linkOAuthAccount(nhat.getId(), "github", githubUser);

        when(oauthAccountRepository.findByProviderAndProviderUserId("github", "gh-200"))
            .thenReturn(Optional.of(linkedGithub));
        UserEntity signedInGithub = provisioningService.provisionOAuthUser("github", githubUser);
        assertEquals(nhat.getId(), signedInGithub.getId());
    }

    @Test
    void linkingProviderAlreadyOwnedByAnotherUserThrowsConflict() {
        UserEntity userA = user("alice", "alice@orbit.dev", "pw");
        UserEntity userB = user("bob", "bob@orbit.dev", "pw");
        OAuthAccountEntity existing = new OAuthAccountEntity();
        existing.setUser(userA);
        existing.setProvider("google");
        existing.setProviderUserId("g-999");

        when(userRepository.findById(userB.getId())).thenReturn(Optional.of(userB));
        when(oauthAccountRepository.findByProviderAndProviderUserId("google", "g-999"))
            .thenReturn(Optional.of(existing));

        OAuth2User googleUser = oauthUser("sub", "g-999", "alice@gmail.com", "Alice");
        ApiException ex = assertThrows(ApiException.class, () ->
            provisioningService.linkOAuthAccount(userB.getId(), "google", googleUser)
        );
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("OAUTH_ACCOUNT_ALREADY_LINKED", ex.getCode());
    }

    @Test
    void disconnectBlocksRemovingLastSignInMethodWhenNoPasswordSet() {
        UserEntity oauthOnly = user("oauth_only", "oauth@gmail.com", null);
        OAuthAccountEntity account = new OAuthAccountEntity();
        account.setId(UUID.randomUUID());
        account.setUser(oauthOnly);
        account.setProvider("google");

        when(oauthAccountRepository.findByIdAndUserId(account.getId(), oauthOnly.getId()))
            .thenReturn(Optional.of(account));
        when(userRepository.findById(oauthOnly.getId())).thenReturn(Optional.of(oauthOnly));
        when(oauthAccountRepository.countByUserId(oauthOnly.getId())).thenReturn(1L);

        ApiException ex = assertThrows(ApiException.class, () ->
            linkedAccountService.disconnectAccount(oauthOnly.getId(), account.getId())
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("LAST_SIGN_IN_METHOD", ex.getCode());
    }

    @Test
    void createLinkStartValidatesProviderAndDisconnectSucceedsWithPassword() {
        UserEntity u = user("nhatprx", "nhat@orbit.dev", "hashed");
        when(userRepository.existsById(u.getId())).thenReturn(true);
        when(oauthAccountRepository.findByUserIdAndProvider(u.getId(), "github")).thenReturn(Optional.empty());

        OAuthLinkStartResponse start = linkedAccountService.createLinkStart(u.getId(), "github");
        assertTrue(start.linkUrl().startsWith("/api/v1/auth/oauth/link/github?token="));

        ApiException bad = assertThrows(ApiException.class, () ->
            linkedAccountService.createLinkStart(u.getId(), "twitter")
        );
        assertEquals("UNSUPPORTED_PROVIDER", bad.getCode());

        OAuthAccountEntity acc = new OAuthAccountEntity();
        acc.setId(UUID.randomUUID());
        acc.setUser(u);
        when(oauthAccountRepository.findByIdAndUserId(acc.getId(), u.getId())).thenReturn(Optional.of(acc));
        when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        when(oauthAccountRepository.countByUserId(u.getId())).thenReturn(1L);

        linkedAccountService.disconnectAccount(u.getId(), acc.getId());
        verify(oauthAccountRepository).delete(acc);
    }

    @Test
    void oauthHandlersRedirectWithLinkParamsWhenSessionHasLinkIntent() throws Exception {
        UserEntity u = user("nhatprx", "nhat@orbit.dev", "pw");
        OAuth2User gh = oauthUser("id", "gh-1", "nhat@gh.dev", "nhat");
        OAuth2AuthenticationToken auth = new OAuth2AuthenticationToken(gh, List.of(), "github");

        when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        when(oauthAccountRepository.findByProviderAndProviderUserId("github", "gh-1")).thenReturn(Optional.empty());
        when(oauthAccountRepository.findByUserIdAndProvider(u.getId(), "github")).thenReturn(Optional.empty());
        when(oauthAccountRepository.save(any(OAuthAccountEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        OAuth2SuccessHandler successHandler = new OAuth2SuccessHandler(
            provisioningService, new RedisSessionService(redisTemplate), "http://localhost:5173"
        );
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.getSession(true).setAttribute(OAuth2SuccessHandler.LINK_USER_ID_ATTR, u.getId().toString());
        req.getSession(true).setAttribute(OAuth2SuccessHandler.LINK_PROVIDER_ATTR, "github");
        MockHttpServletResponse res = new MockHttpServletResponse();

        successHandler.onAuthenticationSuccess(req, res, auth);
        assertEquals("http://localhost:5173?oauth_linked=github", res.getRedirectedUrl());

        OAuth2FailureHandler failureHandler = new OAuth2FailureHandler("http://localhost:5173");
        MockHttpServletRequest failReq = new MockHttpServletRequest();
        failReq.getSession(true).setAttribute(OAuth2SuccessHandler.LINK_USER_ID_ATTR, u.getId().toString());
        MockHttpServletResponse failRes = new MockHttpServletResponse();
        failureHandler.onAuthenticationFailure(failReq, failRes, new BadCredentialsException("Denied"));
        assertEquals("http://localhost:5173?oauth_link_error=Denied", failRes.getRedirectedUrl());
    }

    private UserEntity user(String username, String email, String pwHash) {
        UserEntity u = new UserEntity();
        u.setId(UUID.randomUUID());
        u.setUsername(username);
        u.setEmail(email);
        u.setDisplayName(username);
        u.setPasswordHash(pwHash);
        return u;
    }

    private OAuth2User oauthUser(String idKey, String idVal, String email, String name) {
        return new DefaultOAuth2User(List.of(), Map.of(idKey, idVal, "email", email, "name", name), idKey);
    }
}
