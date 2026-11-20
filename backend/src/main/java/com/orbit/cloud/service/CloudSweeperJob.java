package com.orbit.cloud.service;

import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Redis-locked scheduled sweeper for expired upload sessions and 30-day trashed cloud nodes. */
@Component
@ConditionalOnProperty(name = "orbit.cloud.sweeper.enabled", havingValue = "true", matchIfMissing = true)
public class CloudSweeperJob {

    private static final Logger LOG = LoggerFactory.getLogger(CloudSweeperJob.class);
    private static final String LOCK_KEY = "orbit:lock:cloud-sweeper";
    private static final Duration LOCK_TTL = Duration.ofMinutes(10);

    private final CloudUploadService uploadService;
    private final CloudTrashService trashService;
    private final ObjectProvider<StringRedisTemplate> redisProvider;
    private final String instanceId = UUID.randomUUID().toString();

    public CloudSweeperJob(
        CloudUploadService uploadService,
        CloudTrashService trashService,
        ObjectProvider<StringRedisTemplate> redisProvider
    ) {
        this.uploadService = uploadService;
        this.trashService = trashService;
        this.redisProvider = redisProvider;
    }

    @Scheduled(cron = "${orbit.cloud.sweeper.cron:0 */15 * * * *}")
    public void run() {
        StringRedisTemplate redis = redisProvider.getIfAvailable();
        if (redis == null) {
            return;
        }
        try {
            Boolean acquired = redis.opsForValue().setIfAbsent(LOCK_KEY, instanceId, LOCK_TTL);
            if (!Boolean.TRUE.equals(acquired)) {
                return;
            }
            int expiredSessions = uploadService.expireStaleSessions();
            int purgedTrash = trashService.purgeExpiredTrash();
            if (expiredSessions > 0 || purgedTrash > 0) {
                LOG.info("Cloud sweeper cleaned {} expired upload sessions and {} trashed nodes",
                    expiredSessions, purgedTrash);
            }
        } catch (RuntimeException ex) {
            LOG.warn("Cloud sweeper skipped: {}", ex.getMessage());
        }
    }
}
