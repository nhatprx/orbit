package com.orbit.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private PasswordResetNotifier notifier;

    private PasswordEncoder passwordEncoder;
    private AtomicReference<Instant> currentTime;
    private PasswordResetService resetService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        currentTime = new AtomicReference<>(Instant.parse("2026-11-20T00:00:00Z"));
        Clock mutableClock = new Clock() {
            @Override
            public ZoneOffset getZone() { return ZoneOffset.UTC; }
            @Override
            public Clock withZone(java.time.ZoneId zone) { return this; }
            @Override
            public Instant instant() { return currentTime.get(); }
        };
        resetService = new PasswordResetService(userRepository, passwordEncoder, redisTemplate, notifier, mutableClock);
    }

    @Test
    void forgotPasswordPreventsEmailEnumeration() {
        when(userRepository.findByEmailIgnoreCase("ghost@orbit.dev")).thenReturn(Optional.empty());

        String unknownMsg = resetService.forgotPassword("ghost@orbit.dev");
        String blankMsg = resetService.forgotPassword("   ");

        assertEquals(PasswordResetService.GENERIC_FORGOT_MESSAGE, unknownMsg);
        assertEquals(PasswordResetService.GENERIC_FORGOT_MESSAGE, blankMsg);
        verify(notifier, never()).sendResetToken(anyString(), anyString(), anyLong());
    }

    @Test
    void resetPasswordSucceedsOnceAndRejectsReuse() {
        UserEntity user = buildUser();
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis offline"));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        String forgotMsg = resetService.forgotPassword("USER@orbit.dev");
        assertEquals(PasswordResetService.GENERIC_FORGOT_MESSAGE, forgotMsg);

        ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(notifier).sendResetToken(eq(user.getEmail()), tokenCaptor.capture(), eq(900L));
        String token = tokenCaptor.getValue();
        assertNotNull(token);
        assertTrue(token.length() >= 40);

        String resetMsg = resetService.resetPassword(token, "NewOrbit@2026");
        assertEquals(PasswordResetService.RESET_SUCCESS_MESSAGE, resetMsg);
        assertTrue(passwordEncoder.matches("NewOrbit@2026", user.getPasswordHash()));

        ApiException reuseEx = assertThrows(ApiException.class, () ->
            resetService.resetPassword(token, "Another@2026"));
        assertEquals(HttpStatus.BAD_REQUEST, reuseEx.getStatus());
        assertEquals("INVALID_RESET_TOKEN", reuseEx.getCode());
    }

    @Test
    void expiredTokenIsRejected() {
        UserEntity user = buildUser();
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis offline"));

        resetService.forgotPassword(user.getEmail());
        ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(notifier).sendResetToken(eq(user.getEmail()), tokenCaptor.capture(), eq(900L));

        currentTime.set(currentTime.get().plusSeconds(901));

        ApiException ex = assertThrows(ApiException.class, () ->
            resetService.resetPassword(tokenCaptor.getValue(), "NewOrbit@2026"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_RESET_TOKEN", ex.getCode());
    }

    @Test
    void weakPasswordAndInvalidTokenReturnBadRequest() {
        UserEntity user = buildUser();
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis offline"));

        resetService.forgotPassword(user.getEmail());
        ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(notifier).sendResetToken(eq(user.getEmail()), tokenCaptor.capture(), eq(900L));
        String validToken = tokenCaptor.getValue();

        ApiException weakEx = assertThrows(ApiException.class, () ->
            resetService.resetPassword(validToken, "weak"));
        assertEquals(HttpStatus.BAD_REQUEST, weakEx.getStatus());
        assertEquals("WEAK_PASSWORD", weakEx.getCode());

        ApiException blankTokenEx = assertThrows(ApiException.class, () ->
            resetService.resetPassword("   ", "NewOrbit@2026"));
        assertEquals(HttpStatus.BAD_REQUEST, blankTokenEx.getStatus());
        assertEquals("INVALID_RESET_TOKEN", blankTokenEx.getCode());
    }

    @Test
    void loggingNotifierMasksEmailAndToken() {
        String maskedEmail = LoggingPasswordResetNotifier.maskEmail("nhat@orbit.dev");
        String maskedToken = LoggingPasswordResetNotifier.maskToken("abcdef1234567890");
        assertEquals("n***@orbit.dev", maskedEmail);
        assertEquals("****7890", maskedToken);
        assertFalse(maskedToken.contains("abcdef"));
    }

    private UserEntity buildUser() {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setUsername("orbit_dev");
        user.setEmail("user@orbit.dev");
        user.setDisplayName("Orbit Dev");
        user.setPasswordHash(passwordEncoder.encode("OldOrbit@2026"));
        return user;
    }
}
