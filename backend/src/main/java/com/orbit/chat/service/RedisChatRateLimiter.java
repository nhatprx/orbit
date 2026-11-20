package com.orbit.chat.service;

import com.orbit.common.ApiException;
import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;

/** Fixed-window counter in Redis shared by all API instances. Fails open if Redis is unreachable. */
class RedisChatRateLimiter implements ChatRateLimiter {

    static final int MAX_MESSAGES = 20;
    static final Duration WINDOW = Duration.ofSeconds(10);

    private static final Logger LOG = LoggerFactory.getLogger(RedisChatRateLimiter.class);

    private final StringRedisTemplate redis;

    RedisChatRateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public void check(UUID userId) {
        try {
            String key = "orbit:chat:rate:" + userId;
            Long count = redis.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redis.expire(key, WINDOW);
            }
            if (count != null && count > MAX_MESSAGES) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Too many messages. Slow down.");
            }
        } catch (DataAccessException ex) {
            LOG.warn("Chat rate limiter unavailable, allowing message: {}", ex.getMessage());
        }
    }
}
