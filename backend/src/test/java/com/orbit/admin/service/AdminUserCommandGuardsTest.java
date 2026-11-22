package com.orbit.admin.service;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** Rules that apply before any change is made: self protection, valid input, existing targets. */
class AdminUserCommandGuardsTest extends AdminUserCommandTestBase {

    @Test
    void anAdminNeverActsOnTheirOwnAccount() {
        assertRejected(HttpStatus.CONFLICT, "SELF_ACTION_NOT_ALLOWED", () -> service.changeRole(actor, actor, "user"));
        assertRejected(HttpStatus.CONFLICT, "SELF_ACTION_NOT_ALLOWED", () -> service.disable(actor, actor, null));
        assertRejected(HttpStatus.CONFLICT, "SELF_ACTION_NOT_ALLOWED", () -> service.revokeSessions(actor, actor));
        verifyNoInteractions(users, sessions);
    }

    @Test
    void unsupportedRolesAreRejectedBeforeAnyLookup() {
        for (String bad : new String[] {"root", "", "  ", null, "administrator"}) {
            assertRejected(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                () -> service.changeRole(actor, UUID.randomUUID(), bad));
        }
        verifyNoInteractions(users, sessions);
    }

    @Test
    void unknownTargetsAreNotFound() {
        UUID missing = UUID.randomUUID();
        when(users.findById(missing)).thenReturn(Optional.empty());

        assertRejected(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", () -> service.changeRole(actor, missing, "admin"));
        assertRejected(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", () -> service.disable(actor, missing, null));
        assertRejected(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", () -> service.enable(actor, missing));
        assertRejected(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", () -> service.revokeSessions(actor, missing));
        verifyNoInteractions(sessions);
    }

    @Test
    void revokingSessionsUsesTheLongestTokenLifetime() {
        UserEntity target = known("user");

        service.revokeSessions(actor, target.getId());

        verify(sessions).revokeAllSessions(target.getId(), REMEMBER_ME_SECONDS);
    }
}
