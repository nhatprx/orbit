package com.orbit.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.orbit.auth.dto.AuthSessionResponse;
import com.orbit.auth.dto.LoginRequest;
import com.orbit.auth.dto.RegisterRequest;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
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

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RedisSessionService redisSessionService;

    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = new JwtService(
            "orbit-local-dev-jwt-secret-key-change-me-in-production-2026-secure",
            3600
        );
        authService = new AuthService(userRepository, passwordEncoder, jwtService, redisSessionService);
    }

    @Test
    void registerEnforcesUniqueUsername() {
        when(userRepository.existsByUsernameIgnoreCase("nhatprx")).thenReturn(true);

        RegisterRequest req = new RegisterRequest(
            "nhat@orbit.dev",
            "Orbit@2026",
            "nhatprx",
            "Vietnam",
            true
        );

        ApiException ex = assertThrows(ApiException.class, () -> authService.register(req));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("USERNAME_TAKEN", ex.getCode());
    }

    @Test
    void registerCreatesUserAndIssuesJwt() {
        when(userRepository.existsByUsernameIgnoreCase("nhatprx")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("nhat@orbit.dev")).thenReturn(false);
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> {
            UserEntity u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        RegisterRequest req = new RegisterRequest(
            "nhat@orbit.dev",
            "Orbit@2026",
            "nhatprx",
            "Vietnam",
            true
        );

        AuthSessionResponse res = authService.register(req);
        assertEquals("nhatprx", res.user().username());
        assertNotNull(res.accessToken());
    }

    @Test
    void loginSupportsUsernameIdentifier() {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setUsername("nhatprx");
        user.setEmail("nhat@orbit.dev");
        user.setDisplayName("nhatprx");
        user.setPasswordHash(passwordEncoder.encode("Orbit@2026"));

        when(userRepository.findByUsernameIgnoreCase("nhatprx")).thenReturn(Optional.of(user));

        AuthSessionResponse res = authService.login(new LoginRequest("nhatprx", "Orbit@2026"));
        assertEquals("nhatprx", res.user().username());
        assertNotNull(res.accessToken());
    }
}
