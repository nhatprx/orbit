package com.orbit.git.service;

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

/** Short-lived Redis-backed store for GitHub OAuth popup authorization and encrypted token exchange. */
@Service
public class GitOAuthTokenStore {

    public static final String SESSION_USER_ID_ATTR = "ORBIT_GIT_OAUTH_USER_ID";
    public static final String SESSION_SCOPE_MODE_ATTR = "ORBIT_GIT_OAUTH_SCOPE_MODE";

    private static final Logger log = LoggerFactory.getLogger(GitOAuthTokenStore.class);
    private static final String START_PREFIX = "orbit:git:oauth_start:";
    private static final String CODE_PREFIX = "orbit:git:oauth_code:";
    private static final long START_TTL_SECONDS = 300L;
    private static final long CODE_TTL_SECONDS = 60L;

    private record FallbackEntry(String value, Instant expiresAt) {
        boolean isExpired(Instant now) { return !now.isBefore(expiresAt); }
    }

    private final StringRedisTemplate redisTemplate;
    private final GitTokenCrypto tokenCrypto;
    private final Clock clock;
    private final Map<String, FallbackEntry> fallback = new ConcurrentHashMap<>();

    @Autowired
    public GitOAuthTokenStore(StringRedisTemplate redisTemplate, GitTokenCrypto tokenCrypto) {
        this(redisTemplate, tokenCrypto, Clock.systemUTC());
    }

    public GitOAuthTokenStore(StringRedisTemplate redisTemplate, GitTokenCrypto tokenCrypto, Clock clock) {
        this.redisTemplate = redisTemplate;
        this.tokenCrypto = tokenCrypto;
        this.clock = clock;
    }

    public String createStartToken(UUID userId) {
        String token = UUID.randomUUID().toString().replace("-", "");
        putValue(START_PREFIX + token, userId.toString(), START_TTL_SECONDS);
        return token;
    }

    public Optional<UUID> consumeStartToken(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        String raw = getAndDelete(START_PREFIX + token.trim());
        if (raw == null) return Optional.empty();
        try {
            return Optional.of(UUID.fromString(raw));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    public String createExchangeCode(UUID userId, String rawGitHubToken) {
        if (userId == null || rawGitHubToken == null || rawGitHubToken.isBlank()) {
            throw new IllegalArgumentException("User ID and GitHub token are required.");
        }
        String code = UUID.randomUUID().toString().replace("-", "");
        String encrypted = tokenCrypto.encrypt(rawGitHubToken.trim());
        putValue(CODE_PREFIX + code, userId + ":" + encrypted, CODE_TTL_SECONDS);
        return code;
    }

    public Optional<String> consumeExchangeCode(String code, UUID expectedUserId) {
        if (code == null || code.isBlank() || expectedUserId == null) return Optional.empty();
        String raw = getAndDelete(CODE_PREFIX + code.trim());
        if (raw == null) return Optional.empty();
        int sep = raw.indexOf(':');
        if (sep <= 0 || sep >= raw.length() - 1) return Optional.empty();
        try {
            UUID storedUserId = UUID.fromString(raw.substring(0, sep));
            if (!expectedUserId.equals(storedUserId)) return Optional.empty();
            return Optional.of(tokenCrypto.decrypt(raw.substring(sep + 1)));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return Optional.empty();
        }
    }

    private void putValue(String key, String value, long ttlSeconds) {
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(key, value, Duration.ofSeconds(ttlSeconds));
                return;
            } catch (Exception ex) {
                log.warn("Redis unavailable for Git OAuth store, using fallback: {}", ex.getMessage());
            }
        }
        fallback.put(key, new FallbackEntry(value, clock.instant().plusSeconds(ttlSeconds)));
    }

    private String getAndDelete(String key) {
        FallbackEntry entry = fallback.remove(key);
        String val = (entry != null && !entry.isExpired(clock.instant())) ? entry.value() : null;
        if (redisTemplate != null) {
            try {
                String redisVal = redisTemplate.opsForValue().getAndDelete(key);
                if (redisVal != null) val = redisVal;
            } catch (Exception ex) {
                log.warn("Redis unavailable for Git OAuth consume: {}", ex.getMessage());
            }
        }
        return val;
    }
}
