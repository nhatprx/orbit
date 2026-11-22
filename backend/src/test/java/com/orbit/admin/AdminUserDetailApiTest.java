package com.orbit.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.auth.entity.OAuthAccountEntity;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.OAuthAccountRepository;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

/** Detail and totals endpoints of the admin user API. */
@RequiresDocker
class AdminUserDetailApiTest extends AbstractIntegrationTest {

    private static final String URL = "/api/v1/admin/users";

    @Autowired private MockMvc mvc;
    @Autowired private OAuthAccountRepository oauthAccounts;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    @Test
    void detailShowsProfileProvidersAndWorkspacesWithoutSecrets() {
        UserEntity admin = newAdmin("viewer");
        UserEntity subject = newUser("subject");
        subject.setCountry("Vietnam");
        subject.setOrganization("Orbit Labs");
        userRepository.save(subject);
        UUID workspace = Fixtures.idOf(Fixtures.createWorkspace(api(subject), Fixtures.unique("Detail"), "git"));

        OAuthAccountEntity link = new OAuthAccountEntity();
        link.setUser(subject);
        link.setProvider("github");
        link.setProviderUserId("gh-secret-id-" + subject.getUsername());
        link.setProviderEmail("octo@example.com");
        oauthAccounts.save(link);

        Result detail = api(admin).get(URL + "/" + subject.getId());
        assertEquals(200, detail.status());
        assertEquals(subject.getUsername(), detail.<String>json("$.username"));
        assertEquals("user", detail.<String>json("$.role"));
        assertEquals("ACTIVE", detail.<String>json("$.status"));
        assertEquals("Vietnam", detail.<String>json("$.country"));
        assertEquals("Orbit Labs", detail.<String>json("$.organization"));
        assertEquals(1, detail.<Number>json("$.workspaceCount").intValue());
        assertEquals(workspace.toString(), detail.<String>json("$.workspaces[0].id"));
        assertEquals("Owner", detail.<String>json("$.workspaces[0].roleName"));
        assertTrue(detail.<Boolean>json("$.workspaces[0].owner"));
        assertEquals("github", detail.<String>json("$.linkedProviders[0].provider"));
        assertEquals("octo@example.com", detail.<String>json("$.linkedProviders[0].providerEmail"));

        String body = detail.body();
        for (String secret : List.of("passwordHash", "{noop}", "totpSecret", "totpBackupCodes", "providerUserId", "gh-secret-id")) {
            assertFalse(body.contains(secret), "response must not contain " + secret);
        }
    }

    @Test
    void deletedWorkspacesAreNotCounted() {
        UserEntity admin = newAdmin("viewer2");
        UserEntity subject = newUser("owner2");
        String name = Fixtures.unique("Gone");
        UUID workspace = Fixtures.idOf(Fixtures.createWorkspace(api(subject), name, "git"));
        assertEquals(1, api(admin).get(URL + "/" + subject.getId()).<Number>json("$.workspaceCount").intValue());

        assertEquals(200, api(subject).delete(Fixtures.workspaceUrl(workspace), "{\"confirmName\":\"" + name + "\"}").status());
        assertEquals(0, api(admin).get(URL + "/" + subject.getId()).<Number>json("$.workspaceCount").intValue());
    }

    @Test
    void unknownAndMalformedIdsAreHandledWithoutServerErrors() {
        UserEntity admin = newAdmin("viewer3");
        Result missing = api(admin).get(URL + "/" + UUID.randomUUID());
        assertEquals(404, missing.status());
        assertEquals("USER_NOT_FOUND", missing.<String>json("$.code"));
        assertEquals(400, api(admin).get(URL + "/not-a-uuid").status());
        assertEquals(403, api(newUser("peeker")).get(URL + "/" + admin.getId()).status());
    }

    @Test
    void statsReflectNewAndDisabledAccounts() {
        UserEntity admin = newAdmin("stats");
        Result before = api(admin).get(URL + "/stats");
        newUser("st1");
        UserEntity banned = newUser("st2");
        banned.accountStatus().disable(admin.getId(), null, Instant.now());
        userRepository.save(banned);
        Result after = api(admin).get(URL + "/stats");

        assertEquals(before.<Number>json("$.total").longValue() + 2, after.<Number>json("$.total").longValue());
        assertEquals(before.<Number>json("$.disabled").longValue() + 1, after.<Number>json("$.disabled").longValue());
        assertEquals(before.<Number>json("$.newLast7Days").longValue() + 2, after.<Number>json("$.newLast7Days").longValue());
        assertEquals(before.<Number>json("$.admins").longValue(), after.<Number>json("$.admins").longValue());
    }
}
