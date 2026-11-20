package com.orbit.auth.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.validation.PasswordPolicyValidator;
import com.orbit.common.ApiException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {

    public static final long RESET_TOKEN_TTL_SECONDS = 900L;
    public static final String GENERIC_FORGOT_MESSAGE =
        "If an account exists for that email, a password reset link has been sent.";
    public static final String RESET_SUCCESS_MESSAGE =
        "Password has been reset successfully.";

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final String RESET_TOKEN_PREFIX = "orbit:auth:pwd_reset:";
    private static final int TOKEN_BYTE_LENGTH = 32;

    private record TokenEntry(UUID userId, Instant expiresAt) {
        boolean isExpired(Instant now) {
            return !now.isBefore(expiresAt);
        }
    }

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;
    private final PasswordResetNotifier notifier;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, TokenEntry> fallbackTokens = new ConcurrentHashMap<>();

    @Autowired
    public PasswordResetService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        StringRedisTemplate redisTemplate,
        PasswordResetNotifier notifier
    ) {
        this(userRepository, passwordEncoder, redisTemplate, notifier, Clock.systemUTC());
    }

    PasswordResetService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        StringRedisTemplate redisTemplate,
        PasswordResetNotifier notifier,
        Clock clock
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.redisTemplate = redisTemplate;
        this.notifier = notifier;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public String forgotPassword(String email) {
        if (email == null || email.isBlank()) {
            return GENERIC_FORGOT_MESSAGE;
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        userRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(user -> {
            String token = generateSecureToken();
            storeResetToken(token, user.getId());
            notifier.sendResetToken(user.getEmail(), token, RESET_TOKEN_TTL_SECONDS);
        });
        return GENERIC_FORGOT_MESSAGE;
    }

    @Transactional
    public String resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank()) {
            throw invalidToken();
        }
        PasswordPolicyValidator.validate(newPassword);

        UUID userId = consumeResetToken(token).orElseThrow(this::invalidToken);
        UserEntity user = userRepository.findById(userId).orElseThrow(this::invalidToken);

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return RESET_SUCCESS_MESSAGE;
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[TOKEN_BYTE_LENGTH];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private void storeResetToken(String token, UUID userId) {
        String key = RESET_TOKEN_PREFIX + token;
        try {
            redisTemplate.opsForValue().set(key, userId.toString(), Duration.ofSeconds(RESET_TOKEN_TTL_SECONDS));
        } catch (Exception ex) {
            log.warn("Redis unavailable for password reset store, using fallback: {}", ex.getMessage());
            fallbackTokens.put(key, new TokenEntry(userId, clock.instant().plusSeconds(RESET_TOKEN_TTL_SECONDS)));
        }
    }

    private Optional<UUID> consumeResetToken(String token) {
        String key = RESET_TOKEN_PREFIX + token.trim();
        TokenEntry fallback = fallbackTokens.remove(key);
        UUID resolved = (fallback != null && !fallback.isExpired(clock.instant())) ? fallback.userId() : null;
        try {
            String redisVal = redisTemplate.opsForValue().getAndDelete(key);
            if (redisVal != null && !redisVal.isBlank()) {
                resolved = UUID.fromString(redisVal.trim());
            }
        } catch (IllegalArgumentException ex) {
            log.warn("Malformed user ID stored for password reset token");
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("Redis unavailable for password reset consume: {}", ex.getMessage());
        }
        return Optional.ofNullable(resolved);
    }

    private ApiException invalidToken() {
        return new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_RESET_TOKEN",
            "Password reset token is invalid or expired."
        );
    }
}
