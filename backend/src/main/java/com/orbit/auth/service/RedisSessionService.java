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

@Service
public class RedisSessionService {

    private static final Logger log = LoggerFactory.getLogger(RedisSessionService.class);
    private static final String SESSION_PREFIX = "orbit:auth:session:";
    private static final String OAUTH_CODE_PREFIX = "orbit:auth:oauth_code:";
    private static final long OAUTH_CODE_TTL_SECONDS = 60L;

    private record FallbackEntry(String value, Instant expiresAt) {
        boolean isExpired(Instant now) {
            return !now.isBefore(expiresAt);
        }
    }

    private final StringRedisTemplate redisTemplate;
    private final Clock clock;
    private final Map<String, FallbackEntry> fallbackSessions = new ConcurrentHashMap<>();
    private final Map<String, FallbackEntry> fallbackOAuthCodes = new ConcurrentHashMap<>();

    @Autowired
    public RedisSessionService(StringRedisTemplate redisTemplate) {
        this(redisTemplate, Clock.systemUTC());
    }

    RedisSessionService(StringRedisTemplate redisTemplate, Clock clock) {
        this.redisTemplate = redisTemplate;
        this.clock = clock;
    }

    public void storeActiveSession(String jti, UUID userId, long ttlSeconds) {
        String key = SESSION_PREFIX + jti;
        try {
            redisTemplate.opsForValue().set(key, userId.toString(), Duration.ofSeconds(ttlSeconds));
        } catch (Exception ex) {
            log.warn("Redis unavailable for session store, using fallback cache: {}", ex.getMessage());
            fallbackSessions.put(key, new FallbackEntry(userId.toString(), clock.instant().plusSeconds(ttlSeconds)));
        }
    }

    public boolean isSessionActive(String jti) {
        if (jti == null || jti.isBlank()) return false;
        String key = SESSION_PREFIX + jti;
        try {
            Boolean exists = redisTemplate.hasKey(key);
            if (Boolean.TRUE.equals(exists)) return true;
        } catch (Exception ex) {
            log.warn("Redis unavailable for session check: {}", ex.getMessage());
        }
        FallbackEntry entry = fallbackSessions.get(key);
        if (entry == null) return false;
        if (entry.isExpired(clock.instant())) {
            fallbackSessions.remove(key);
            return false;
        }
        return true;
    }

    public void revokeSession(String jti) {
        if (jti == null || jti.isBlank()) return;
        String key = SESSION_PREFIX + jti;
        fallbackSessions.remove(key);
        try {
            redisTemplate.delete(key);
        } catch (Exception ex) {
            log.warn("Redis unavailable for session revoke: {}", ex.getMessage());
        }
    }

    public String createOAuthExchangeCode(UUID userId) {
        String code = UUID.randomUUID().toString().replace("-", "");
        String key = OAUTH_CODE_PREFIX + code;
        try {
            redisTemplate.opsForValue().set(key, userId.toString(), Duration.ofSeconds(OAUTH_CODE_TTL_SECONDS));
        } catch (Exception ex) {
            log.warn("Redis unavailable for OAuth code store, using fallback: {}", ex.getMessage());
            fallbackOAuthCodes.put(
                key,
                new FallbackEntry(userId.toString(), clock.instant().plusSeconds(OAUTH_CODE_TTL_SECONDS))
            );
        }
        return code;
    }

    public Optional<UUID> consumeOAuthExchangeCode(String code) {
        if (code == null || code.isBlank()) return Optional.empty();
        String key = OAUTH_CODE_PREFIX + code.trim();
        FallbackEntry fallback = fallbackOAuthCodes.remove(key);
        String raw = (fallback != null && !fallback.isExpired(clock.instant())) ? fallback.value() : null;
        try {
            String redisVal = redisTemplate.opsForValue().getAndDelete(key);
            if (redisVal != null) raw = redisVal;
        } catch (Exception ex) {
            log.warn("Redis unavailable for OAuth code consume: {}", ex.getMessage());
        }
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(raw.trim()));
        } catch (IllegalArgumentException ex) {
            log.warn("Malformed user ID stored for OAuth exchange code");
            return Optional.empty();
        }
    }
}
