package com.orbit.auth.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/** Short-lived Redis-backed tokens for OAuth account linking and 2FA login challenges. */
@Service
public class AuthEphemeralStore {

    private static final Logger log = LoggerFactory.getLogger(AuthEphemeralStore.class);
    private static final String LINK_PREFIX = "orbit:auth:oauth_link:";
    private static final String MFA_PREFIX = "orbit:auth:mfa_challenge:";
    private static final long LINK_TTL_SECONDS = 300L;
    private static final long MFA_TTL_SECONDS = 300L;
    private static final int MAX_MFA_ATTEMPTS = 5;

    public record OAuthLinkIntent(UUID userId, String provider) {}
    public record MfaChallenge(UUID userId, boolean rememberMe, int attempts) {}
    private record FallbackEntry(String value, Instant expiresAt) {
        boolean isExpired(Instant now) { return !now.isBefore(expiresAt); }
    }

    private final StringRedisTemplate redisTemplate;
    private final Clock clock;
    private final Map<String, FallbackEntry> fallback = new ConcurrentHashMap<>();

    @Autowired
    public AuthEphemeralStore(StringRedisTemplate redisTemplate) {
        this(redisTemplate, Clock.systemUTC());
    }

    AuthEphemeralStore(StringRedisTemplate redisTemplate, Clock clock) {
        this.redisTemplate = redisTemplate;
        this.clock = clock;
    }

    public String createOAuthLinkToken(UUID userId, String provider) {
        String token = UUID.randomUUID().toString().replace("-", "");
        putValue(LINK_PREFIX + token, userId + ":" + provider, LINK_TTL_SECONDS);
        return token;
    }

    public Optional<OAuthLinkIntent> consumeOAuthLinkToken(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        String raw = getAndDelete(LINK_PREFIX + token.trim());
        if (raw == null) return Optional.empty();
        String[] parts = raw.split(":", 2);
        if (parts.length != 2) return Optional.empty();
        try {
            return Optional.of(new OAuthLinkIntent(UUID.fromString(parts[0]), parts[1]));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    public String createMfaChallenge(UUID userId, boolean rememberMe) {
        String token = UUID.randomUUID().toString().replace("-", "");
        putValue(MFA_PREFIX + token, userId + ":" + rememberMe + ":0", MFA_TTL_SECONDS);
        return token;
    }

    public Optional<MfaChallenge> peekMfaChallenge(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        return parseChallenge(getValue(MFA_PREFIX + token.trim()));
    }

    public boolean recordMfaFailure(String token) {
        Optional<MfaChallenge> existing = peekMfaChallenge(token);
        if (existing.isEmpty()) return false;
        int nextAttempts = existing.get().attempts() + 1;
        String key = MFA_PREFIX + token.trim();
        if (nextAttempts >= MAX_MFA_ATTEMPTS) {
            deleteValue(key);
            return true;
        }
        putValue(key, existing.get().userId() + ":" + existing.get().rememberMe() + ":" + nextAttempts, MFA_TTL_SECONDS);
        return false;
    }

    public void consumeMfaChallenge(String token) {
        if (token == null || token.isBlank()) return;
        deleteValue(MFA_PREFIX + token.trim());
    }

    private Optional<MfaChallenge> parseChallenge(String raw) {
        if (raw == null) return Optional.empty();
        String[] parts = raw.split(":", 3);
        if (parts.length != 3) return Optional.empty();
        try {
            return Optional.of(new MfaChallenge(
                UUID.fromString(parts[0]),
                Boolean.parseBoolean(parts[1]),
                Integer.parseInt(parts[2])
            ));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private void putValue(String key, String value, long ttlSeconds) {
        try {
            redisTemplate.opsForValue().set(key, value, Duration.ofSeconds(ttlSeconds));
        } catch (Exception ex) {
            log.warn("Redis unavailable for ephemeral store, using fallback: {}", ex.getMessage());
            fallback.put(key, new FallbackEntry(value, clock.instant().plusSeconds(ttlSeconds)));
        }
    }

    private String getValue(String key) {
        try {
            String val = redisTemplate.opsForValue().get(key);
            if (val != null) return val;
        } catch (Exception ex) {
            log.warn("Redis unavailable for ephemeral get: {}", ex.getMessage());
        }
        FallbackEntry entry = fallback.get(key);
        if (entry == null) return null;
        if (entry.isExpired(clock.instant())) {
            fallback.remove(key);
            return null;
        }
        return entry.value();
    }

    private String getAndDelete(String key) {
        FallbackEntry entry = fallback.remove(key);
        String val = (entry != null && !entry.isExpired(clock.instant())) ? entry.value() : null;
        try {
            String redisVal = redisTemplate.opsForValue().getAndDelete(key);
            if (redisVal != null) val = redisVal;
        } catch (Exception ex) {
            log.warn("Redis unavailable for ephemeral consume: {}", ex.getMessage());
        }
        return val;
    }

    private void deleteValue(String key) {
        fallback.remove(key);
        try {
            redisTemplate.delete(key);
        } catch (Exception ex) {
            log.warn("Redis unavailable for ephemeral delete: {}", ex.getMessage());
        }
    }
}
