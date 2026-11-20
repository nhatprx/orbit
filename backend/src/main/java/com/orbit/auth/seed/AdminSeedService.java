package com.orbit.auth.seed;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.validation.UsernameNormalizer;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminSeedService {

    private static final Logger log = LoggerFactory.getLogger(AdminSeedService.class);
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final String ADMIN_ROLE = "ADMIN";
    private static final String DEFAULT_WORKSPACE_ID = "ws_orbit_core";
    private static final String DEFAULT_DISPLAY_NAME = "Orbit Admin";
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminSeedService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserEntity seedAdmin(String email, String rawPassword, String displayName) {
        String normalizedEmail = validateAndNormalizeEmail(email);
        validatePassword(rawPassword);
        String resolvedDisplayName = resolveDisplayName(displayName);
        String encodedPassword = passwordEncoder.encode(rawPassword);

        Optional<UserEntity> existing = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (existing.isPresent()) {
            UserEntity user = existing.get();
            user.setRole(ADMIN_ROLE);
            user.setDisplayName(resolvedDisplayName);
            user.setPasswordHash(encodedPassword);
            UserEntity saved = userRepository.save(user);
            log.info("Updated admin account for email={} role={}", normalizedEmail, saved.getRole());
            return saved;
        }

        String username = allocateUniqueUsername(normalizedEmail);
        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setEmail(normalizedEmail);
        user.setDisplayName(resolvedDisplayName);
        user.setPasswordHash(encodedPassword);
        user.setRole(ADMIN_ROLE);
        user.setWorkspaceId(DEFAULT_WORKSPACE_ID);

        UserEntity saved = userRepository.save(user);
        log.info("Created admin account for email={} username={} role={}", normalizedEmail, username, saved.getRole());
        return saved;
    }

    private String validateAndNormalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Admin email is required.");
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (!EMAIL_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("Admin email format is invalid.");
        }
        return normalized;
    }

    private void validatePassword(String rawPassword) {
        if (rawPassword == null || rawPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("Admin password must be at least 8 characters long.");
        }
    }

    private String resolveDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            return DEFAULT_DISPLAY_NAME;
        }
        String trimmed = displayName.trim();
        return trimmed.length() > 100 ? trimmed.substring(0, 100) : trimmed;
    }

    private String allocateUniqueUsername(String normalizedEmail) {
        String localPart = normalizedEmail.substring(0, normalizedEmail.indexOf('@'));
        String base = UsernameNormalizer.sanitizeCandidate(localPart, "admin_");
        if (!userRepository.existsByUsernameIgnoreCase(base)) {
            return base;
        }
        for (int i = 1; i <= 99; i++) {
            String candidate = base + "_" + i;
            if (!userRepository.existsByUsernameIgnoreCase(candidate)) {
                return candidate;
            }
        }
        return base + "_" + (System.currentTimeMillis() % 100000);
    }
}
