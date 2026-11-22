package com.orbit.admin.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.service.JwtService;
import com.orbit.auth.service.RedisSessionService;
import com.orbit.common.ApiException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

/** Shared wiring for the admin command tests: the service under test with mocked collaborators. */
@ExtendWith(MockitoExtension.class)
abstract class AdminUserCommandTestBase {

    static final long REMEMBER_ME_SECONDS = 2_592_000L;

    @Mock UserRepository users;
    @Mock RedisSessionService sessions;
    @Mock AdminUserQueryService queries;

    final UUID actor = UUID.randomUUID();
    AdminUserCommandService service;

    @BeforeEach
    void setUpService() {
        JwtService jwt = new JwtService(
            "orbit-local-dev-jwt-secret-key-change-me-in-production-2026-secure", 3600L, REMEMBER_ME_SECONDS
        );
        service = new AdminUserCommandService(users, sessions, jwt, queries);
    }

    /** A stored user with the given role, resolvable through the mocked repository. */
    UserEntity known(String role) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setUsername("u" + user.getId().toString().substring(0, 6));
        user.setRole(role);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        return user;
    }

    static UserEntity adminWithId(UUID id) {
        UserEntity admin = new UserEntity();
        admin.setId(id);
        admin.setRole("admin");
        return admin;
    }

    static void assertRejected(HttpStatus status, String code, Runnable action) {
        ApiException ex = assertThrows(ApiException.class, action::run);
        assertEquals(status, ex.getStatus());
        assertEquals(code, ex.getCode());
    }
}
