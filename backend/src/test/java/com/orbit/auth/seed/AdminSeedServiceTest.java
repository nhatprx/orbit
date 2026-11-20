package com.orbit.auth.seed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AdminSeedServiceTest {

    @Mock
    private UserRepository userRepository;

    private PasswordEncoder passwordEncoder;
    private AdminSeedService adminSeedService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        adminSeedService = new AdminSeedService(userRepository, passwordEncoder);
    }

    @Test
    void seedAdminCreatesNewAdminWithBcryptHash() {
        when(userRepository.findByEmailIgnoreCase("admin@orbit.dev")).thenReturn(Optional.empty());
        when(userRepository.existsByUsernameIgnoreCase("admin")).thenReturn(false);
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> {
            UserEntity u = inv.getArgument(0);
            if (u.getId() == null) u.setId(UUID.randomUUID());
            return u;
        });

        UserEntity created = adminSeedService.seedAdmin("  ADMIN@orbit.dev ", "Str0ng!Pass", "Root Admin");

        assertEquals("admin@orbit.dev", created.getEmail());
        assertEquals("admin", created.getUsername());
        assertEquals("Root Admin", created.getDisplayName());
        assertEquals("ADMIN", created.getRole());
        assertNotEquals("Str0ng!Pass", created.getPasswordHash());
        assertTrue(passwordEncoder.matches("Str0ng!Pass", created.getPasswordHash()));
    }

    @Test
    void seedAdminIsIdempotentAndUpgradesExistingUser() {
        UserEntity existing = new UserEntity();
        existing.setId(UUID.randomUUID());
        existing.setUsername("existing_user");
        existing.setEmail("admin@orbit.dev");
        existing.setDisplayName("Old Name");
        existing.setRole("user");
        existing.setPasswordHash(passwordEncoder.encode("OldPass!123"));

        when(userRepository.findByEmailIgnoreCase("admin@orbit.dev")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        UserEntity updated = adminSeedService.seedAdmin("admin@orbit.dev", "NewAdmin!2026", "Orbit Root");

        assertEquals(existing.getId(), updated.getId());
        assertEquals("ADMIN", updated.getRole());
        assertEquals("Orbit Root", updated.getDisplayName());
        assertTrue(passwordEncoder.matches("NewAdmin!2026", updated.getPasswordHash()));
    }

    @Test
    void seedAdminAllocatesFallbackUsernameOnCollision() {
        when(userRepository.findByEmailIgnoreCase("ops@orbit.dev")).thenReturn(Optional.empty());
        when(userRepository.existsByUsernameIgnoreCase("ops")).thenReturn(true);
        when(userRepository.existsByUsernameIgnoreCase("ops_1")).thenReturn(false);
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        UserEntity created = adminSeedService.seedAdmin("ops@orbit.dev", "OpsAdmin!2026", "");
        assertEquals("ops_1", created.getUsername());
        assertEquals("Orbit Admin", created.getDisplayName());
    }

    @Test
    void seedAdminRejectsInvalidEmailAndShortPassword() {
        assertThrows(IllegalArgumentException.class, () ->
            adminSeedService.seedAdmin("", "ValidPass!1", "Admin"));
        assertThrows(IllegalArgumentException.class, () ->
            adminSeedService.seedAdmin("not-an-email", "ValidPass!1", "Admin"));
        assertThrows(IllegalArgumentException.class, () ->
            adminSeedService.seedAdmin("admin@orbit.dev", "short7!", "Admin"));
        assertThrows(IllegalArgumentException.class, () ->
            adminSeedService.seedAdmin("admin@orbit.dev", null, "Admin"));
    }

    @Test
    void runnerIsGuardedByConditionalOnPropertyAndDelegates() {
        ConditionalOnProperty annotation = AdminSeedRunner.class.getAnnotation(ConditionalOnProperty.class);
        assertNotNull(annotation);
        assertEquals("orbit.seed-admin", annotation.prefix());
        assertEquals("enabled", annotation.name()[0]);
        assertEquals("true", annotation.havingValue());

        AdminSeedProperties props = new AdminSeedProperties();
        props.setEnabled(true);
        props.setEmail("root@orbit.dev");
        props.setPassword("RootPass!2026");
        props.setName("Orbit Root");
        assertEquals("Orbit Root", props.getDisplayName());

        when(userRepository.findByEmailIgnoreCase("root@orbit.dev")).thenReturn(Optional.empty());
        when(userRepository.existsByUsernameIgnoreCase("root")).thenReturn(false);
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminSeedRunner runner = new AdminSeedRunner(props, adminSeedService);
        runner.run();

        verify(userRepository).save(any(UserEntity.class));
    }
}
