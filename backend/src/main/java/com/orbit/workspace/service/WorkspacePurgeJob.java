package com.orbit.workspace.service;

import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Hourly purge. A Redis lock keeps multiple API instances from purging concurrently. */
@Component
@ConditionalOnProperty(name = "orbit.workspace.purge.enabled", havingValue = "true", matchIfMissing = true)
public class WorkspacePurgeJob {

    private static final Logger LOG = LoggerFactory.getLogger(WorkspacePurgeJob.class);
    private static final String LOCK_KEY = "orbit:lock:workspace-purge";
    private static final Duration LOCK_TTL = Duration.ofMinutes(10);
    private static final int BATCH_SIZE = 50;

    private final WorkspacePurgeService purgeService;
    private final StringRedisTemplate redis;
    private final String instanceId = UUID.randomUUID().toString();

    public WorkspacePurgeJob(WorkspacePurgeService purgeService, StringRedisTemplate redis) {
        this.purgeService = purgeService;
        this.redis = redis;
    }

    @Scheduled(cron = "${orbit.workspace.purge.cron:0 15 * * * *}")
    public void run() {
        try {
            Boolean acquired = redis.opsForValue().setIfAbsent(LOCK_KEY, instanceId, LOCK_TTL);
            if (!Boolean.TRUE.equals(acquired)) {
                return;
            }
            int purged = purgeService.purgeExpired(BATCH_SIZE);
            if (purged > 0) {
                LOG.info("Purged {} expired workspaces", purged);
            }
        } catch (RuntimeException ex) {
            LOG.warn("Workspace purge skipped: {}", ex.getMessage());
        }
    }
}
