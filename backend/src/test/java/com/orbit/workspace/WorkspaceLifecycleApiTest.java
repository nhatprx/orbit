package com.orbit.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.auth.entity.UserEntity;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import com.orbit.workspace.entity.WorkspaceEntity;
import com.orbit.workspace.repository.WorkspaceRepository;
import com.orbit.workspace.service.WorkspacePurgeService;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

@RequiresDocker
class WorkspaceLifecycleApiTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private WorkspaceRepository workspaces;
    @Autowired private WorkspacePurgeService purgeService;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    private static String confirm(String name) {
        return "{\"confirmName\":\"" + name + "\"}";
    }

    @Test
    void softDeleteNeedsOwnerAndExactNameThenHidesAndRestores() {
        UserEntity owner = newUser("owner");
        UserEntity admin = newUser("admin");
        String name = Fixtures.unique("Doomed");
        UUID id = Fixtures.idOf(Fixtures.createWorkspace(api(owner), name, "git"));
        addWorkspaceMember(id, admin, "Admin");
        String url = Fixtures.workspaceUrl(id);

        assertEquals(403, api(admin).delete(url, confirm(name)).status());
        assertEquals(400, api(owner).delete(url, "{\"confirmName\":\"\"}").status());
        Result mismatch = api(owner).delete(url, confirm(name.toLowerCase()));
        assertEquals(400, mismatch.status());
        assertEquals("CONFIRMATION_NAME_MISMATCH", mismatch.<String>json("$.code"));

        Result deleted = api(owner).delete(url, confirm(name));
        assertEquals(200, deleted.status());
        assertNotNull(deleted.<String>json("$.deletedAt"));
        Instant deletedAt = Instant.parse(deleted.<String>json("$.deletedAt"));
        Instant purgeAfter = Instant.parse(deleted.<String>json("$.purgeAfter"));
        assertEquals(Duration.ofDays(30), Duration.between(deletedAt, purgeAfter));

        Result hidden = api(owner).get(url);
        assertEquals(404, hidden.status());
        assertEquals("WORKSPACE_NOT_FOUND", hidden.<String>json("$.code"));
        assertEquals(404, api(admin).get(url).status());
        assertEquals(404, Fixtures.createProject(api(owner), id, "Nope").status());

        assertEquals(0, api(owner).get("/api/v1/workspaces").<Integer>json("$.totalElements"));
        Result withDeleted = api(owner).get("/api/v1/workspaces?includeDeleted=true");
        assertEquals(1, withDeleted.<Integer>json("$.totalElements"));
        assertEquals(0, api(admin).get("/api/v1/workspaces?includeDeleted=true").<Integer>json("$.totalElements"));

        assertEquals(403, api(admin).post(url + "/restore").status());
        Result restored = api(owner).post(url + "/restore");
        assertEquals(200, restored.status());
        assertEquals(200, api(owner).get(url).status());
        assertEquals(409, api(owner).post(url + "/restore").status());
    }

    @Test
    void restoreFailsAfterRetentionWindow() {
        UserEntity owner = newUser("owner");
        String name = Fixtures.unique("Expired");
        UUID id = Fixtures.idOf(Fixtures.createWorkspace(api(owner), name, "git"));
        api(owner).delete(Fixtures.workspaceUrl(id), confirm(name));

        WorkspaceEntity entity = workspaces.findById(id).orElseThrow();
        entity.setPurgeAfter(Instant.now().minusSeconds(60));
        workspaces.save(entity);

        assertEquals(404, api(owner).post(Fixtures.workspaceUrl(id) + "/restore").status());
        assertEquals(0, api(owner).get("/api/v1/workspaces?includeDeleted=true").<Integer>json("$.totalElements"));
    }

    @Test
    void purgeJobHardDeletesExpiredWorkspacesWithTheirData() {
        UserEntity owner = newUser("owner");
        String name = Fixtures.unique("Purge");
        UUID id = Fixtures.idOf(Fixtures.createWorkspace(api(owner), name, "git", "chat"));
        UUID projectId = Fixtures.idOf(Fixtures.createProject(api(owner), id, "Inner"));
        api(owner).delete(Fixtures.workspaceUrl(id), confirm(name));

        assertEquals(0, purgeService.purgeExpired(10));
        WorkspaceEntity entity = workspaces.findById(id).orElseThrow();
        entity.setPurgeAfter(Instant.now().minusSeconds(1));
        workspaces.save(entity);

        assertTrue(purgeService.purgeExpired(10) >= 1);
        assertFalse(workspaces.existsById(id));
        assertTrue(workspaceRoles.findByWorkspaceIdOrderByCreatedAtAsc(id).isEmpty());
        assertTrue(projectRoles.findByProjectIdOrderByCreatedAtAsc(projectId).isEmpty());
        assertEquals(0, api(owner).get("/api/v1/workspaces?includeDeleted=true").<Integer>json("$.totalElements"));
    }

    @Test
    void ownershipTransferKeepsExactlyOneOwner() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UserEntity stranger = newUser("stranger");
        UUID id = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Own"), "git"));
        addWorkspaceMember(id, member, "Member");
        String url = Fixtures.workspaceUrl(id) + "/transfer-ownership";
        String body = "{\"targetUserId\":\"%s\"}";

        assertEquals(403, api(member).post(url, body.formatted(member.getId())).status());
        assertEquals(400, api(owner).post(url, body.formatted(owner.getId())).status());
        Result notMember = api(owner).post(url, body.formatted(stranger.getId()));
        assertEquals(400, notMember.status());
        assertEquals("TARGET_NOT_MEMBER", notMember.<String>json("$.code"));

        Result done = api(owner).post(url, body.formatted(member.getId()));
        assertEquals(200, done.status());
        assertEquals(member.getId().toString(), done.<String>json("$.ownerId"));
        assertFalse(done.<List<String>>json("$.myPermissions").contains("workspace.delete"));

        Result asNewOwner = api(member).get(Fixtures.workspaceUrl(id));
        assertTrue(asNewOwner.<List<String>>json("$.myPermissions").contains("workspace.delete"));
        assertEquals(403, api(owner).delete(Fixtures.workspaceUrl(id), confirm("x")).status());
    }
}
