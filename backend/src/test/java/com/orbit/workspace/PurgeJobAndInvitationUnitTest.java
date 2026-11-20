package com.orbit.workspace;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.access.entity.InvitationEntity;
import com.orbit.access.entity.InvitationStatus;
import com.orbit.workspace.service.WorkspacePurgeJob;
import com.orbit.workspace.service.WorkspacePurgeService;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

class PurgeJobAndInvitationUnitTest {

    @SuppressWarnings("unchecked")
    private static StringRedisTemplate redisWithLock(Boolean acquired) {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        when(ops.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(acquired);
        return redis;
    }

    @Test
    void purgeRunsOnlyWhenTheDistributedLockIsAcquired() {
        WorkspacePurgeService service = mock(WorkspacePurgeService.class);
        when(service.purgeExpired(anyInt())).thenReturn(2);

        new WorkspacePurgeJob(service, redisWithLock(true)).run();
        verify(service).purgeExpired(50);

        WorkspacePurgeService skipped = mock(WorkspacePurgeService.class);
        new WorkspacePurgeJob(skipped, redisWithLock(false)).run();
        new WorkspacePurgeJob(skipped, redisWithLock(null)).run();
        verify(skipped, never()).purgeExpired(anyInt());
    }

    @Test
    void purgeSwallowsInfrastructureFailuresSoTheSchedulerKeepsRunning() {
        WorkspacePurgeService service = mock(WorkspacePurgeService.class);
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.opsForValue()).thenThrow(new QueryTimeoutException("redis down"));
        assertDoesNotThrow(() -> new WorkspacePurgeJob(service, redis).run());

        WorkspacePurgeService failing = mock(WorkspacePurgeService.class);
        when(failing.purgeExpired(eq(50))).thenThrow(new IllegalStateException("db down"));
        assertDoesNotThrow(() -> new WorkspacePurgeJob(failing, redisWithLock(true)).run());
    }

    @Test
    void pendingInvitationsReadAsExpiredOnlyAfterTheirDeadline() {
        InvitationEntity invitation = new InvitationEntity();
        Instant now = Instant.parse("2026-11-20T00:00:00Z");

        invitation.setExpiresAt(now.plusSeconds(1));
        assertEquals(InvitationStatus.PENDING, invitation.effectiveStatus(now));
        invitation.setExpiresAt(now);
        assertEquals(InvitationStatus.EXPIRED, invitation.effectiveStatus(now));
        invitation.setExpiresAt(now.minus(Duration.ofDays(1)));
        assertEquals(InvitationStatus.EXPIRED, invitation.effectiveStatus(now));

        for (InvitationStatus terminal : new InvitationStatus[] {
            InvitationStatus.REVOKED, InvitationStatus.ACCEPTED, InvitationStatus.DECLINED
        }) {
            invitation.setStatus(terminal);
            assertEquals(terminal, invitation.effectiveStatus(now));
        }
    }
}
