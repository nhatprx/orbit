package com.orbit.admin.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;

/** Role changes, disabling and enabling: the invariants, without a database. */
class AdminUserCommandServiceTest extends AdminUserCommandTestBase {

    @Test
    void demotingTheOnlyOtherActiveAdminIsRejected() {
        UserEntity target = known("admin");
        when(users.lockActiveAdmins()).thenReturn(List.of(target));

        assertRejected(HttpStatus.CONFLICT, "LAST_ADMIN", () -> service.changeRole(actor, target.getId(), "user"));
        assertEquals("admin", target.getRole());
        verify(users, never()).save(any());
        verifyNoInteractions(sessions);
    }

    @Test
    void demotionLocksAdminRowsBeforeWritingAndThenSignsTheTargetOut() {
        UserEntity target = known("admin");
        when(users.lockActiveAdmins()).thenReturn(List.of(target, adminWithId(actor)));

        service.changeRole(actor, target.getId(), "USER");

        InOrder order = inOrder(users, sessions);
        order.verify(users).lockActiveAdmins();
        order.verify(users).save(target);
        order.verify(sessions).revokeAllSessions(target.getId(), REMEMBER_ME_SECONDS);
        assertEquals("user", target.getRole());
    }

    @Test
    void promotingNeverNeedsTheAdminLock() {
        UserEntity target = known("user");

        service.changeRole(actor, target.getId(), "admin");

        assertEquals("admin", target.getRole());
        verify(users, never()).lockActiveAdmins();
        verify(sessions).revokeAllSessions(target.getId(), REMEMBER_ME_SECONDS);
    }

    @Test
    void repeatingTheCurrentRoleIsANoOp() {
        UserEntity target = known("ADMIN");

        service.changeRole(actor, target.getId(), "admin");

        verify(users, never()).save(any());
        verifyNoInteractions(sessions);
    }

    @Test
    void disablingTheOnlyOtherActiveAdminIsRejected() {
        UserEntity target = known("admin");
        when(users.lockActiveAdmins()).thenReturn(List.of(target));

        assertRejected(HttpStatus.CONFLICT, "LAST_ADMIN", () -> service.disable(actor, target.getId(), "x"));
        assertFalse(target.isDisabled());
        verifyNoInteractions(sessions);
    }

    @Test
    void disablingARegularUserSkipsTheAdminLockAndRecordsTheActor() {
        UserEntity target = known("user");

        service.disable(actor, target.getId(), "  abuse  ");

        assertTrue(target.isDisabled());
        assertEquals(actor, target.accountStatus().getDisabledBy());
        assertEquals("abuse", target.accountStatus().getDisabledReason());
        verify(users, never()).lockActiveAdmins();
        verify(sessions).revokeAllSessions(target.getId(), REMEMBER_ME_SECONDS);
    }

    @Test
    void disablingAgainKeepsTheRecordButEndsSessionsOnceMore() {
        UserEntity target = known("user");
        Instant earlier = Instant.parse("2026-01-01T00:00:00Z");
        target.accountStatus().disable(UUID.randomUUID(), "old", earlier);

        service.disable(actor, target.getId(), "new");

        assertEquals(earlier, target.accountStatus().getDisabledAt());
        assertEquals("old", target.accountStatus().getDisabledReason());
        verify(users, never()).save(any());
        verify(sessions).revokeAllSessions(target.getId(), REMEMBER_ME_SECONDS);
    }

    @Test
    void blankReasonBecomesNullAndOverlongReasonIsRejected() {
        UserEntity blank = known("user");
        service.disable(actor, blank.getId(), "   ");
        assertNull(blank.accountStatus().getDisabledReason());

        UserEntity target = known("user");
        assertRejected(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
            () -> service.disable(actor, target.getId(), "x".repeat(256)));
        assertFalse(target.isDisabled());
    }

    @Test
    void enableClearsTheStatusAndIsANoOpForActiveUsers() {
        UserEntity banned = known("user");
        banned.accountStatus().disable(actor, "oops", Instant.now());
        service.enable(actor, banned.getId());
        assertFalse(banned.isDisabled());
        assertNull(banned.accountStatus().getDisabledBy());
        verify(users).save(banned);

        UserEntity active = known("user");
        service.enable(actor, active.getId());
        verify(users, never()).save(active);
        verifyNoInteractions(sessions);
    }
}
