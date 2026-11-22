package com.orbit.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.service.RedisSessionService;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.RequiresDocker;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Disable, enable and revoke-sessions endpoints of the admin user API. */
@RequiresDocker
class AdminUserAccountApiTest extends AbstractIntegrationTest {

    private static final String URL = "/api/v1/admin/users/";

    @Autowired private MockMvc mvc;
    @MockitoBean private RedisSessionService sessions;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    private UserEntity stored(UserEntity user) {
        return userRepository.findById(user.getId()).orElseThrow();
    }

    @Test
    void disableRecordsWhoAndWhyAndEndsSessions() {
        UserEntity admin = newAdmin("moderator");
        UserEntity target = newUser("offender");

        Result result = api(admin).post(URL + target.getId() + "/disable", "{\"reason\":\"  spam  \"}");
        assertEquals(200, result.status());
        assertEquals("DISABLED", result.<String>json("$.status"));
        assertEquals("spam", result.<String>json("$.disabledReason"));
        assertEquals(admin.getUsername(), result.<String>json("$.disabledByUsername"));
        assertNotNull(result.<String>json("$.disabledAt"));
        assertTrue(stored(target).isDisabled());
        assertEquals(admin.getId(), stored(target).accountStatus().getDisabledBy());
        verify(sessions).revokeAllSessions(eq(target.getId()), anyLong());
    }

    @Test
    void disablingAgainKeepsTheOriginalRecordButStillRevokesSessions() {
        UserEntity admin = newAdmin("moderator");
        UserEntity target = newUser("repeat");
        Result first = api(admin).post(URL + target.getId() + "/disable", "{\"reason\":\"first\"}");

        Result again = api(admin).post(URL + target.getId() + "/disable", "{\"reason\":\"second\"}");
        assertEquals(200, again.status());
        assertEquals(first.<String>json("$.disabledAt"), again.<String>json("$.disabledAt"));
        assertEquals("first", again.<String>json("$.disabledReason"));
        verify(sessions, times(2)).revokeAllSessions(eq(target.getId()), anyLong());
    }

    @Test
    void reasonIsOptionalAndBlankReasonIsStoredAsNothing() {
        UserEntity admin = newAdmin("moderator");
        UserEntity noBody = newUser("nobody");
        UserEntity blank = newUser("blank");

        assertEquals(200, api(admin).post(URL + noBody.getId() + "/disable").status());
        Result result = api(admin).post(URL + blank.getId() + "/disable", "{\"reason\":\"   \"}");
        assertEquals(200, result.status());
        assertNull(result.<Object>json("$.disabledReason"));
        assertNull(stored(blank).accountStatus().getDisabledReason());
    }

    @Test
    void disableValidatesInputAndTargets() {
        UserEntity admin = newAdmin("moderator");
        UserEntity target = newUser("valid");

        Result tooLong = api(admin).post(URL + target.getId() + "/disable", "{\"reason\":\"" + "x".repeat(256) + "\"}");
        assertEquals(400, tooLong.status());
        assertEquals("VALIDATION_ERROR", tooLong.<String>json("$.code"));
        assertFalse(stored(target).isDisabled());

        Result self = api(admin).post(URL + admin.getId() + "/disable");
        assertEquals(409, self.status());
        assertEquals("SELF_ACTION_NOT_ALLOWED", self.<String>json("$.code"));
        assertEquals(404, api(admin).post(URL + UUID.randomUUID() + "/disable").status());
        assertEquals(400, api(admin).post(URL + "bad-id/disable").status());
        verifyNoInteractions(sessions);
    }

    @Test
    void aDisabledAdminCanNoLongerUseTheAdminApi() {
        UserEntity admin = newAdmin("moderator");
        UserEntity peer = newAdmin("peer");

        assertEquals(200, api(admin).post(URL + peer.getId() + "/disable").status());
        assertEquals(403, api(peer).get("/api/v1/admin/users").status());
    }

    @Test
    void enableClearsTheStatusAndIsIdempotent() {
        UserEntity admin = newAdmin("moderator");
        UserEntity target = newUser("pardoned");
        api(admin).post(URL + target.getId() + "/disable", "{\"reason\":\"oops\"}");

        Result enabled = api(admin).post(URL + target.getId() + "/enable");
        assertEquals(200, enabled.status());
        assertEquals("ACTIVE", enabled.<String>json("$.status"));
        assertNull(enabled.<Object>json("$.disabledReason"));
        assertNull(enabled.<Object>json("$.disabledByUsername"));
        assertFalse(stored(target).isDisabled());
        assertNull(stored(target).accountStatus().getDisabledBy());

        assertEquals(200, api(admin).post(URL + target.getId() + "/enable").status());
        assertEquals(404, api(admin).post(URL + UUID.randomUUID() + "/enable").status());
    }

    @Test
    void revokeSessionsReturnsNoContentAndProtectsTheCaller() {
        UserEntity admin = newAdmin("moderator");
        UserEntity target = newUser("signedin");

        assertEquals(204, api(admin).post(URL + target.getId() + "/revoke-sessions").status());
        verify(sessions).revokeAllSessions(eq(target.getId()), anyLong());

        assertEquals(409, api(admin).post(URL + admin.getId() + "/revoke-sessions").status());
        assertEquals(404, api(admin).post(URL + UUID.randomUUID() + "/revoke-sessions").status());
        verify(sessions, times(1)).revokeAllSessions(eq(target.getId()), anyLong());
    }

    @Test
    void nonAdminsCannotUseAnyAccountAction() {
        UserEntity plain = newUser("plain");
        UserEntity target = newUser("target");

        for (String action : List.of("/disable", "/enable", "/revoke-sessions")) {
            Result denied = api(plain).post(URL + target.getId() + action);
            assertEquals(403, denied.status(), action);
            assertEquals("ADMIN_REQUIRED", denied.<String>json("$.code"), action);
        }
        assertFalse(stored(target).isDisabled());
        verifyNoInteractions(sessions);
    }
}
