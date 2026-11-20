package com.orbit.ai.service;

import com.orbit.ai.config.AiProperties;
import com.orbit.common.ApiException;
import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class AiRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(AiRateLimiter.class);

    private final StringRedisTemplate redisTemplate;
    private final AiProperties properties;

    public AiRateLimiter(StringRedisTemplate redisTemplate, AiProperties properties) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
    }

    public void checkAllowed(UUID userId) {
        String key = "orbit:rl:ai:" + userId;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redisTemplate.expire(key, Duration.ofMinutes(1));
            }
            if (count != null && count > properties.getRateLimitPerMinute()) {
                throw new ApiException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "AI_RATE_LIMITED",
                    "AI rate limit reached. Please wait a moment before sending another prompt."
                );
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("AI rate limiter skipped (Redis unavailable): {}", ex.getMessage());
        }
    }
}
