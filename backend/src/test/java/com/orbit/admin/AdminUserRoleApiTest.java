package com.orbit.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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

/** PATCH /api/v1/admin/users/{id}/role: guards, idempotency and session revocation. */
@RequiresDocker
class AdminUserRoleApiTest extends AbstractIntegrationTest {

    private static final String URL = "/api/v1/admin/users/";

    @Autowired private MockMvc mvc;
    @MockitoBean private RedisSessionService sessions;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    private static String roleBody(String role) {
        return "{\"role\":\"" + role + "\"}";
    }

    private String roleInDb(UserEntity user) {
        return userRepository.findById(user.getId()).orElseThrow().getRole();
    }

    @Test
    void promotionAndDemotionSignTheTargetOut() {
        UserEntity admin = newAdmin("boss");
        UserEntity target = newUser("target");

        Result up = api(admin).patch(URL + target.getId() + "/role", roleBody("Admin"));
        assertEquals(200, up.status());
        assertEquals("admin", up.<String>json("$.role"));
        assertEquals("admin", roleInDb(target));
        verify(sessions).revokeAllSessions(eq(target.getId()), anyLong());

        Result down = api(admin).patch(URL + target.getId() + "/role", roleBody("user"));
        assertEquals("user", down.<String>json("$.role"));
        assertEquals("user", roleInDb(target));
        verify(sessions, times(2)).revokeAllSessions(eq(target.getId()), anyLong());
    }

    @Test
    void repeatingTheCurrentRoleChangesNothing() {
        UserEntity admin = newAdmin("boss");
        UserEntity target = newUser("steady");

        Result same = api(admin).patch(URL + target.getId() + "/role", roleBody("user"));
        assertEquals(200, same.status());
        assertEquals("user", same.<String>json("$.role"));
        verify(sessions, never()).revokeAllSessions(any(), anyLong());
    }

    @Test
    void anAdminCannotChangeTheirOwnRole() {
        UserEntity admin = newAdmin("selfish");

        Result self = api(admin).patch(URL + admin.getId() + "/role", roleBody("user"));
        assertEquals(409, self.status());
        assertEquals("SELF_ACTION_NOT_ALLOWED", self.<String>json("$.code"));
        assertEquals("admin", roleInDb(admin));
        verifyNoInteractions(sessions);
    }

    @Test
    void aDemotedAdminLosesAdminApiAccessImmediately() {
        UserEntity admin = newAdmin("boss");
        UserEntity peer = newAdmin("peer");

        assertEquals(200, api(admin).patch(URL + peer.getId() + "/role", roleBody("user")).status());
        // The entity still claims admin in its token, but the database no longer does.
        assertEquals(403, api(peer).get("/api/v1/admin/users").status());
    }

    @Test
    void invalidRequestsAreRejectedBeforeAnythingChanges() {
        UserEntity admin = newAdmin("strict");
        UserEntity target = newUser("victim");
        String url = URL + target.getId() + "/role";

        for (String body : List.of(roleBody("root"), roleBody(""), "{}", "not json", "{\"role\":42}")) {
            Result result = api(admin).patch(url, body);
            assertEquals(400, result.status(), body);
        }
        assertEquals("VALIDATION_ERROR", api(admin).patch(url, roleBody("root")).<String>json("$.code"));
        assertEquals("user", roleInDb(target));

        assertEquals(404, api(admin).patch(URL + UUID.randomUUID() + "/role", roleBody("admin")).status());
        assertEquals(400, api(admin).patch(URL + "bad-id/role", roleBody("admin")).status());
        verifyNoInteractions(sessions);
    }

    @Test
    void nonAdminsCannotChangeRoles() {
        UserEntity plain = newUser("plain");
        UserEntity target = newUser("target");

        Result denied = api(plain).patch(URL + target.getId() + "/role", roleBody("admin"));
        assertEquals(403, denied.status());
        assertEquals("ADMIN_REQUIRED", denied.<String>json("$.code"));
        assertEquals("user", roleInDb(target));
        verifyNoInteractions(sessions);
    }
}
