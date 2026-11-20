package com.orbit.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.orbit.auth.dto.AuthSessionResponse;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.security.OAuth2FailureHandler;
import com.orbit.auth.security.OAuth2SuccessHandler;
import com.orbit.common.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

@ExtendWith(MockitoExtension.class)
class OAuth2ExchangeAndHandlersTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private OAuthUserProvisioningService provisioningService;

    private AtomicReference<Instant> currentTime;
    private RedisSessionService redisSessionService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        currentTime = new AtomicReference<>(Instant.parse("2026-11-20T00:00:00Z"));
        Clock mutableClock = new Clock() {
            @Override
            public ZoneOffset getZone() { return ZoneOffset.UTC; }
            @Override
            public Clock withZone(java.time.ZoneId zone) { return this; }
            @Override
            public Instant instant() { return currentTime.get(); }
        };

        lenient().when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis offline in unit test"));
        redisSessionService = new RedisSessionService(redisTemplate, mutableClock);
        JwtService jwtService = new JwtService(
            "orbit-local-dev-jwt-secret-key-change-me-in-production-2026-secure",
            3600L,
            2_592_000L
        );
        authService = new AuthService(userRepository, new BCryptPasswordEncoder(), jwtService, redisSessionService);
    }

    @Test
    void validCodeExchangesOnceAndRejectsReuse() {
        UserEntity user = buildUser();
        String code = redisSessionService.createOAuthExchangeCode(user.getId());
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        AuthSessionResponse res = authService.exchangeOAuthCode(code);
        assertEquals(user.getUsername(), res.user().username());
        assertNotNull(res.accessToken());
        assertEquals(3600L, res.expiresIn());

        ApiException reuseEx = assertThrows(ApiException.class, () -> authService.exchangeOAuthCode(code));
        assertEquals(HttpStatus.UNAUTHORIZED, reuseEx.getStatus());
        assertEquals("INVALID_OAUTH_CODE", reuseEx.getCode());
    }

    @Test
    void expiredOAuthCodeIsRejected() {
        UserEntity user = buildUser();
        String code = redisSessionService.createOAuthExchangeCode(user.getId());
        currentTime.set(currentTime.get().plusSeconds(61));

        ApiException ex = assertThrows(ApiException.class, () -> authService.exchangeOAuthCode(code));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("INVALID_OAUTH_CODE", ex.getCode());
    }

    @Test
    void blankNullAndMalformedCodesAreRejected() {
        for (String badCode : new String[]{null, "", "   ", "not-a-real-code"}) {
            ApiException ex = assertThrows(ApiException.class, () -> authService.exchangeOAuthCode(badCode));
            assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
            assertEquals("INVALID_OAUTH_CODE", ex.getCode());
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void malformedUuidInRedisReturnsUnauthorizedInsteadOfServerError() {
        StringRedisTemplate mockRedis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(mockRedis.opsForValue()).thenReturn(valueOps);
        when(valueOps.getAndDelete("orbit:auth:oauth_code:corrupt-code")).thenReturn("not-a-uuid");

        RedisSessionService service = new RedisSessionService(mockRedis);
        assertTrue(service.consumeOAuthExchangeCode("corrupt-code").isEmpty());
    }

    @Test
    void missingUserForValidOAuthCodeReturnsNotFound() {
        UUID missingId = UUID.randomUUID();
        String code = redisSessionService.createOAuthExchangeCode(missingId);
        when(userRepository.findById(missingId)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> authService.exchangeOAuthCode(code));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
        assertEquals("USER_NOT_FOUND", ex.getCode());
    }

    @Test
    void successAndFailureHandlersRedirectToFrontendUrl() throws Exception {
        UserEntity user = buildUser();
        OAuth2User oauth2User = new DefaultOAuth2User(
            java.util.List.of(),
            Map.of("sub", "12345", "email", user.getEmail()),
            "sub"
        );
        OAuth2AuthenticationToken token = new OAuth2AuthenticationToken(oauth2User, java.util.List.of(), "google");
        when(provisioningService.provisionOAuthUser(eq("google"), any(OAuth2User.class))).thenReturn(user);

        OAuth2SuccessHandler successHandler = new OAuth2SuccessHandler(
            provisioningService, redisSessionService, "https://orbit.nhatprx.com"
        );
        MockHttpServletResponse successRes = new MockHttpServletResponse();
        successHandler.onAuthenticationSuccess(new MockHttpServletRequest(), successRes, token);
        assertNotNull(successRes.getRedirectedUrl());
        assertTrue(successRes.getRedirectedUrl().startsWith("https://orbit.nhatprx.com?oauth_code="));

        OAuth2FailureHandler failureHandler = new OAuth2FailureHandler("https://orbit.nhatprx.com");
        MockHttpServletResponse failureRes = new MockHttpServletResponse();
        failureHandler.onAuthenticationFailure(
            new MockHttpServletRequest(), failureRes, new BadCredentialsException("Access denied")
        );
        assertEquals("https://orbit.nhatprx.com?oauth_error=Access%20denied", failureRes.getRedirectedUrl());
    }

    private UserEntity buildUser() {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setUsername("oauth_user");
        user.setEmail("oauth@orbit.dev");
        user.setDisplayName("OAuth User");
        user.setRole("user");
        user.setWorkspaceId("ws_orbit_core");
        return user;
    }
}
