package com.orbit.cloud.service;

import com.orbit.common.ApiException;
import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Fixed-window Redis rate limiter for presign endpoints. Fails open if Redis is unavailable. */
@Component
public class CloudRateLimiter {

    static final int MAX_REQUESTS = 60;
    static final Duration WINDOW = Duration.ofMinutes(1);

    private static final Logger LOG = LoggerFactory.getLogger(CloudRateLimiter.class);

    private final ObjectProvider<StringRedisTemplate> redisProvider;

    public CloudRateLimiter(ObjectProvider<StringRedisTemplate> redisProvider) {
        this.redisProvider = redisProvider;
    }

    public void checkPresignLimit(UUID userId, String action) {
        StringRedisTemplate redis = redisProvider.getIfAvailable();
        if (redis == null) {
            return;
        }
        try {
            String key = "orbit:cloud:rate:" + action + ":" + userId;
            Long count = redis.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redis.expire(key, WINDOW);
            }
            if (count != null && count > MAX_REQUESTS) {
                throw new ApiException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "RATE_LIMITED",
                    "Too many upload or download requests. Please try again shortly."
                );
            }
        } catch (DataAccessException ex) {
            LOG.warn("Cloud rate limiter unavailable, allowing request: {}", ex.getMessage());
        }
    }
}
