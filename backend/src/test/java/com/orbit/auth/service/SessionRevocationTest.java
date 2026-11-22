package com.orbit.auth.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

/** Per-user session revocation: a "valid after" instant, with and without Redis. */
class SessionRevocationTest {

    private static final long TTL = 3600L;

    private final Map<String, String> redis = new HashMap<>();
    private final AtomicLong now = new AtomicLong(1_000L);
    private final UUID alice = UUID.randomUUID();
    private final UUID bob = UUID.randomUUID();
    private RedisSessionService sessions;

    private Clock clock() {
        return new Clock() {
            @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(java.time.ZoneId zone) { return this; }
            @Override public Instant instant() { return Instant.ofEpochMilli(now.get()); }
        };
    }

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        StringRedisTemplate template = mock(StringRedisTemplate.class);
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(template.opsForValue()).thenReturn(ops);
        doAnswer(inv -> {
            redis.put(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(ops).set(anyString(), anyString(), any(Duration.class));
        when(ops.get(anyString())).thenAnswer(inv -> redis.get(inv.<String>getArgument(0)));
        when(template.delete(anyString())).thenAnswer(inv -> redis.remove(inv.<String>getArgument(0)) != null);
        sessions = new RedisSessionService(template, clock());
    }

    private RedisSessionService offline() {
        StringRedisTemplate template = mock(StringRedisTemplate.class);
        when(template.opsForValue()).thenThrow(new IllegalStateException("redis offline"));
        return new RedisSessionService(template, clock());
    }

    @Test
    void sessionsAreActiveUntilTheUserIsRevoked() {
        sessions.storeActiveSession("a1", alice, TTL);
        sessions.storeActiveSession("b1", bob, TTL);
        assertTrue(sessions.isSessionActive("a1"));

        now.set(2_000L);
        sessions.revokeAllSessions(alice, TTL);

        assertFalse(sessions.isSessionActive("a1"));
        assertTrue(sessions.isSessionActive("b1"), "other users are unaffected");
    }

    @Test
    void aLoginAfterTheRevocationWorks() {
        sessions.storeActiveSession("old", alice, TTL);
        now.set(2_000L);
        sessions.revokeAllSessions(alice, TTL);

        now.set(2_001L);
        sessions.storeActiveSession("fresh", alice, TTL);

        assertFalse(sessions.isSessionActive("old"));
        assertTrue(sessions.isSessionActive("fresh"));
    }

    @Test
    void aSessionFromTheSameMillisecondAsTheRevocationIsRevoked() {
        sessions.storeActiveSession("edge", alice, TTL);
        sessions.revokeAllSessions(alice, TTL);

        assertFalse(sessions.isSessionActive("edge"));
    }

    @Test
    void sessionsCreatedBeforeTheMechanismExistedAreRevokedToo() {
        redis.put("orbit:auth:session:legacy", alice.toString());
        assertTrue(sessions.isSessionActive("legacy"));

        sessions.revokeAllSessions(alice, TTL);

        assertFalse(sessions.isSessionActive("legacy"));
    }

    @Test
    void loggingOutOneSessionLeavesTheOthers() {
        sessions.storeActiveSession("one", alice, TTL);
        sessions.storeActiveSession("two", alice, TTL);

        sessions.revokeSession("one");

        assertFalse(sessions.isSessionActive("one"));
        assertTrue(sessions.isSessionActive("two"));
    }

    @Test
    void blankOrUnknownTokensAreNeverActive() {
        assertFalse(sessions.isSessionActive(null));
        assertFalse(sessions.isSessionActive("  "));
        assertFalse(sessions.isSessionActive("never-issued"));
    }

    @Test
    void aGarbledRevocationMarkerDoesNotLockUsersOut() {
        redis.put("orbit:auth:valid_after:" + alice, "not-a-number");
        sessions.storeActiveSession("fresh", alice, TTL);

        assertTrue(sessions.isSessionActive("fresh"));
    }

    @Test
    void revocationStillWorksWhenRedisIsDown() {
        RedisSessionService local = offline();
        local.storeActiveSession("a1", alice, TTL);
        local.storeActiveSession("b1", bob, TTL);
        assertTrue(local.isSessionActive("a1"));

        now.set(5_000L);
        local.revokeAllSessions(alice, TTL);
        now.set(5_001L);
        local.storeActiveSession("a2", alice, TTL);

        assertFalse(local.isSessionActive("a1"));
        assertTrue(local.isSessionActive("a2"));
        assertTrue(local.isSessionActive("b1"));
    }

    @Test
    void fallbackSessionsStillExpire() {
        RedisSessionService local = offline();
        local.storeActiveSession("short", alice, 10L);

        now.set(1_000L + 10_000L);

        assertFalse(local.isSessionActive("short"));
    }
}
