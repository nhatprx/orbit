package com.orbit.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.orbit.auth.dto.LoginRequest;
import com.orbit.auth.dto.MfaLoginRequest;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.service.AuthEphemeralStore.MfaChallenge;
import com.orbit.common.ApiException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** A disabled account can never start a session, whichever sign-in path it uses. */
@ExtendWith(MockitoExtension.class)
class DisabledAccountLoginTest {

    private static final String PASSWORD = "Orbit@2026";

    @Mock private UserRepository userRepository;
    @Mock private RedisSessionService sessions;
    @Mock private AuthEphemeralStore ephemeralStore;
    @Mock private AccountSecurityService accountSecurity;

    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private AuthService authService;
    private UserEntity user;

    @BeforeEach
    void setUp() {
        JwtService jwt = new JwtService(
            "orbit-local-dev-jwt-secret-key-change-me-in-production-2026-secure", 3600L, 2_592_000L
        );
        authService = new AuthService(userRepository, encoder, jwt, sessions, ephemeralStore, accountSecurity, null);
        user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setUsername("banned");
        user.setEmail("banned@orbit.test");
        user.setDisplayName("banned");
        user.setPasswordHash(encoder.encode(PASSWORD));
        user.accountStatus().disable(UUID.randomUUID(), "spam", Instant.now());
    }

    private static void assertDisabled(Runnable signIn) {
        ApiException ex = assertThrows(ApiException.class, signIn::run);
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("ACCOUNT_DISABLED", ex.getCode());
    }

    @Test
    void passwordLoginIsRefusedWithADistinctCodeAndNoSession() {
        when(userRepository.findByUsernameIgnoreCase("banned")).thenReturn(Optional.of(user));

        assertDisabled(() -> authService.login(new LoginRequest("banned", PASSWORD)));

        verify(sessions, never()).storeActiveSession(anyString(), any(), anyLong());
    }

    @Test
    void aWrongPasswordStillLooksLikeAnyOtherFailure() {
        when(userRepository.findByUsernameIgnoreCase("banned")).thenReturn(Optional.of(user));

        ApiException ex = assertThrows(ApiException.class, () -> authService.login(new LoginRequest("banned", "nope")));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("INVALID_CREDENTIALS", ex.getCode());
    }

    @Test
    void usersWithTwoFactorGetNoChallengeEither() {
        user.setTotpEnabled(true);
        when(userRepository.findByUsernameIgnoreCase("banned")).thenReturn(Optional.of(user));

        assertDisabled(() -> authService.login(new LoginRequest("banned", PASSWORD)));

        verifyNoInteractions(ephemeralStore);
    }

    @Test
    void oauthExchangeIsRefused() {
        when(sessions.consumeOAuthExchangeCode("code")).thenReturn(Optional.of(user.getId()));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        assertDisabled(() -> authService.exchangeOAuthCode("code"));

        verify(sessions, never()).storeActiveSession(anyString(), any(), anyLong());
    }

    @Test
    void aChallengeIssuedBeforeTheAccountWasDisabledCannotBeCompleted() {
        when(ephemeralStore.peekMfaChallenge("tok")).thenReturn(Optional.of(new MfaChallenge(user.getId(), false, 0)));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        assertDisabled(() -> authService.completeMfaLogin(new MfaLoginRequest("tok", "123456")));

        verifyNoInteractions(accountSecurity);
        verify(ephemeralStore, never()).consumeMfaChallenge(any());
        verify(sessions, never()).storeActiveSession(anyString(), any(), anyLong());
    }

    @Test
    void enablingTheAccountRestoresSignIn() {
        user.accountStatus().enable();
        when(userRepository.findByUsernameIgnoreCase("banned")).thenReturn(Optional.of(user));

        assertNotNull(authService.login(new LoginRequest("banned", PASSWORD)).accessToken());
    }
}
