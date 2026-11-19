package com.orbit.auth.service;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RedisSessionService {

    private static final Logger log = LoggerFactory.getLogger(RedisSessionService.class);
    private static final String SESSION_PREFIX = "orbit:auth:session:";
    private static final String OAUTH_CODE_PREFIX = "orbit:auth:oauth_code:";

    private final StringRedisTemplate redisTemplate;
    private final Map<String, String> fallbackSessions = new ConcurrentHashMap<>();
    private final Map<String, String> fallbackOAuthCodes = new ConcurrentHashMap<>();

    public RedisSessionService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void storeActiveSession(String jti, UUID userId, long ttlSeconds) {
        String key = SESSION_PREFIX + jti;
        try {
            redisTemplate.opsForValue().set(key, userId.toString(), Duration.ofSeconds(ttlSeconds));
        } catch (Exception ex) {
            log.warn("Redis unavailable for session store, using fallback cache: {}", ex.getMessage());
            fallbackSessions.put(key, userId.toString());
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
        return fallbackSessions.containsKey(key);
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
            redisTemplate.opsForValue().set(key, userId.toString(), Duration.ofSeconds(60));
        } catch (Exception ex) {
            log.warn("Redis unavailable for OAuth code store, using fallback: {}", ex.getMessage());
            fallbackOAuthCodes.put(key, userId.toString());
        }
        return code;
    }

    public Optional<UUID> consumeOAuthExchangeCode(String code) {
        if (code == null || code.isBlank()) return Optional.empty();
        String key = OAUTH_CODE_PREFIX + code.trim();
        String raw = fallbackOAuthCodes.remove(key);
        try {
            String redisVal = redisTemplate.opsForValue().getAndDelete(key);
            if (redisVal != null) raw = redisVal;
        } catch (Exception ex) {
            log.warn("Redis unavailable for OAuth code consume: {}", ex.getMessage());
        }
        return raw == null ? Optional.empty() : Optional.of(UUID.fromString(raw));
    }
}
