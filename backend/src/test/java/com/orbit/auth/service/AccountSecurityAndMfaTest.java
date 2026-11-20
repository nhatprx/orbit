package com.orbit.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.orbit.auth.dto.AuthSessionResponse;
import com.orbit.auth.dto.ChangePasswordRequest;
import com.orbit.auth.dto.DisableTwoFactorRequest;
import com.orbit.auth.dto.LoginRequest;
import com.orbit.auth.dto.MfaLoginRequest;
import com.orbit.auth.dto.TwoFactorEnableResponse;
import com.orbit.auth.dto.TwoFactorSetupResponse;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.OAuthAccountRepository;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AccountSecurityAndMfaTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private OAuthAccountRepository oauthAccountRepository;
    @Mock
    private StringRedisTemplate redisTemplate;

    private PasswordEncoder passwordEncoder;
    private TotpService totpService;
    private AccountSecurityService securityService;
    private AuthEphemeralStore ephemeralStore;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis offline"));
        passwordEncoder = new BCryptPasswordEncoder();
        Clock fixedClock = Clock.fixed(Instant.parse("2026-11-20T12:00:00Z"), ZoneOffset.UTC);
        totpService = new TotpService(fixedClock);
        securityService = new AccountSecurityService(userRepository, oauthAccountRepository, passwordEncoder, totpService);
        ephemeralStore = new AuthEphemeralStore(redisTemplate, fixedClock);
        RedisSessionService sessionService = new RedisSessionService(redisTemplate, fixedClock);
        JwtService jwtService = new JwtService(
            "orbit-local-dev-jwt-secret-key-change-me-in-production-2026-secure", 3600L, 2_592_000L
        );
        authService = new AuthService(
            userRepository, passwordEncoder, jwtService, sessionService, ephemeralStore, securityService, null
        );
    }

    @Test
    void changePasswordEnforcesCurrentPasswordAndAllowsOAuthOnlyFirstPassword() {
        UserEntity user = buildUser(passwordEncoder.encode("Orbit@2026"));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        ApiException wrongCur = assertThrows(ApiException.class, () ->
            securityService.changePassword(user.getId(), new ChangePasswordRequest("Wrong@2026", "NewPass@2026"))
        );
        assertEquals("INVALID_CURRENT_PASSWORD", wrongCur.getCode());

        securityService.changePassword(user.getId(), new ChangePasswordRequest("Orbit@2026", "NewPass@2026"));
        assertTrue(passwordEncoder.matches("NewPass@2026", user.getPasswordHash()));

        UserEntity oauthOnly = buildUser(null);
        when(userRepository.findById(oauthOnly.getId())).thenReturn(Optional.of(oauthOnly));
        securityService.changePassword(oauthOnly.getId(), new ChangePasswordRequest(null, "FirstPass@2026"));
        assertTrue(passwordEncoder.matches("FirstPass@2026", oauthOnly.getPasswordHash()));
    }

    @Test
    void twoFactorSetupEnableLoginWithTotpAndBackupCodeAndDisable() {
        UserEntity user = buildUser(passwordEncoder.encode("Orbit@2026"));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.findByUsernameIgnoreCase("nhatprx")).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(oauthAccountRepository.findByUserIdOrderByCreatedAtAsc(user.getId())).thenReturn(List.of());

        ApiException wrongPwSetup = assertThrows(ApiException.class, () ->
            securityService.beginTwoFactorSetup(user.getId(), "Wrong@2026")
        );
        assertEquals("INVALID_CURRENT_PASSWORD", wrongPwSetup.getCode());

        TwoFactorSetupResponse setup = securityService.beginTwoFactorSetup(user.getId(), "Orbit@2026");
        assertNotNull(setup.secret());
        assertTrue(setup.otpauthUri().startsWith("otpauth://totp/"));

        ApiException badEnable = assertThrows(ApiException.class, () ->
            securityService.enableTwoFactor(user.getId(), "Orbit@2026", "000000")
        );
        assertEquals("INVALID_TOTP_CODE", badEnable.getCode());

        String validCode = totpService.generateCurrentCode(setup.secret());
        ApiException wrongPwEnable = assertThrows(ApiException.class, () ->
            securityService.enableTwoFactor(user.getId(), "Wrong@2026", validCode)
        );
        assertEquals("INVALID_CURRENT_PASSWORD", wrongPwEnable.getCode());

        TwoFactorEnableResponse enabled = securityService.enableTwoFactor(user.getId(), "Orbit@2026", validCode);
        assertTrue(enabled.enabled());
        assertEquals(8, enabled.backupCodes().size());
        assertTrue(user.isTotpEnabled());
        assertEquals(8, securityService.getSecurityStatus(user.getId()).backupCodesRemaining());

        AuthSessionResponse challenge = authService.login(new LoginRequest("nhatprx", "Orbit@2026", false));
        assertTrue(challenge.mfaRequired());
        assertNotNull(challenge.mfaToken());
        assertNull(challenge.accessToken());

        AuthSessionResponse completed = authService.completeMfaLogin(
            new MfaLoginRequest(challenge.mfaToken(), validCode)
        );
        assertFalse(completed.mfaRequired());
        assertNotNull(completed.accessToken());

        AuthSessionResponse challenge2 = authService.login(new LoginRequest("nhatprx", "Orbit@2026", false));
        String backup = enabled.backupCodes().get(0);
        AuthSessionResponse completedByBackup = authService.completeMfaLogin(
            new MfaLoginRequest(challenge2.mfaToken(), backup)
        );
        assertNotNull(completedByBackup.accessToken());
        assertEquals(7, securityService.getSecurityStatus(user.getId()).backupCodesRemaining());

        AuthSessionResponse challenge3 = authService.login(new LoginRequest("nhatprx", "Orbit@2026", false));
        ApiException reusedBackup = assertThrows(ApiException.class, () ->
            authService.completeMfaLogin(new MfaLoginRequest(challenge3.mfaToken(), backup))
        );
        assertEquals("INVALID_TOTP_CODE", reusedBackup.getCode());

        securityService.disableTwoFactor(user.getId(), new DisableTwoFactorRequest("Orbit@2026", validCode));
        assertFalse(user.isTotpEnabled());
        assertNull(user.getTotpSecret());
    }

    private UserEntity buildUser(String passwordHash) {
        UserEntity u = new UserEntity();
        u.setId(UUID.randomUUID());
        u.setUsername("nhatprx");
        u.setEmail("nhat@orbit.dev");
        u.setDisplayName("Nhat");
        u.setPasswordHash(passwordHash);
        u.setRole("user");
        u.setWorkspaceId("ws_orbit_core");
        return u;
    }
}
