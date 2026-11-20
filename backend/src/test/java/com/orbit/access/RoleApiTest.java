package com.orbit.access;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.auth.entity.UserEntity;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

@RequiresDocker
class RoleApiTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    @Test
    void workspaceRolesAreSeededAndCustomRolesFollowTheRules() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Roles"), "git"));
        addWorkspaceMember(ws, member, "Member");
        String url = Fixtures.workspaceUrl(ws) + "/roles";

        Result list = api(owner).get(url);
        assertEquals(200, list.status());
        assertEquals(3, list.<List<Object>>json("$").size());
        assertEquals(24, list.<List<Integer>>json("$[?(@.name=='Owner')].permissions.length()").getFirst());
        assertEquals(1, list.<List<Integer>>json("$[?(@.name=='Member')].memberCount").getFirst());
        assertTrue(list.<List<Boolean>>json("$[?(@.name=='Owner')].immutable").getFirst());

        Result created = api(owner).post(url, Fixtures.roleBody("QA", "workspace.view", "chat.read"));
        assertEquals(201, created.status());
        assertEquals("WORKSPACE", created.<String>json("$.scope"));
        assertEquals(List.of("chat.read", "workspace.view"), created.<List<String>>json("$.permissions"));

        assertEquals(409, api(owner).post(url, Fixtures.roleBody("qa", "workspace.view")).status());
        assertEquals("ROLE_NAME_TAKEN", api(owner).post(url, Fixtures.roleBody("QA")).<String>json("$.code"));
        assertEquals(400, api(owner).post(url, Fixtures.roleBody("Bad", "project.view")).status());
        assertEquals(400, api(owner).post(url, "{\"name\":\"\",\"permissions\":[]}").status());
        assertEquals(403, api(member).post(url, Fixtures.roleBody("Nope", "workspace.view")).status());
    }

    @Test
    void ownerRoleIsImmutableAndSystemRolesCannotBeDeletedOrRenamed() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("System"), "git"));
        String url = Fixtures.workspaceUrl(ws) + "/roles/";
        UUID ownerRole = Fixtures.workspaceRoleId(api(owner), ws, "Owner");
        UUID adminRole = Fixtures.workspaceRoleId(api(owner), ws, "Admin");

        Result edit = api(owner).patch(url + ownerRole, "{\"permissions\":[\"workspace.view\"]}");
        assertEquals(403, edit.status());
        assertEquals("SYSTEM_ROLE_IMMUTABLE", edit.<String>json("$.code"));
        assertEquals(403, api(owner).delete(url + ownerRole).status());
        assertEquals(403, api(owner).patch(url + adminRole, "{\"name\":\"Boss\"}").status());
        assertEquals(403, api(owner).delete(url + adminRole).status());

        Result trimmed = api(owner).patch(url + adminRole, "{\"permissions\":[\"workspace.view\",\"member.view\"]}");
        assertEquals(200, trimmed.status());
        assertEquals(2, trimmed.<List<String>>json("$.permissions").size());
        assertEquals(404, api(owner).patch(url + UUID.randomUUID(), "{\"name\":\"X\"}").status());
    }

    @Test
    void rolesInUseCannotBeDeletedUntilMembersAreReassigned() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("InUse"), "git"));
        addWorkspaceMember(ws, member, "Member");
        String base = Fixtures.workspaceUrl(ws);

        UUID qa = UUID.fromString(api(owner).post(base + "/roles", Fixtures.roleBody("QA", "workspace.view"))
            .<String>json("$.id"));
        UUID memberRole = Fixtures.workspaceRoleId(api(owner), ws, "Member");
        assertEquals(200, api(owner).patch(base + "/members/" + member.getId() + "/role",
            "{\"roleId\":\"" + qa + "\"}").status());

        Result inUse = api(owner).delete(base + "/roles/" + qa);
        assertEquals(409, inUse.status());
        assertEquals("ROLE_IN_USE", inUse.<String>json("$.code"));

        api(owner).patch(base + "/members/" + member.getId() + "/role", "{\"roleId\":\"" + memberRole + "\"}");
        assertEquals(204, api(owner).delete(base + "/roles/" + qa).status());
        assertEquals(404, api(owner).delete(base + "/roles/" + qa).status());
    }

    @Test
    void adminsCannotGrantPermissionsTheyDoNotHold() {
        UserEntity owner = newUser("owner");
        UserEntity admin = newUser("admin");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Escalate"), "git"));
        addWorkspaceMember(ws, admin, "Admin");
        String url = Fixtures.workspaceUrl(ws) + "/roles";

        assertEquals(201, api(admin).post(url, Fixtures.roleBody("Ok", "workspace.view", "role.view")).status());
        Result denied = api(admin).post(url, Fixtures.roleBody("Sneaky", "workspace.delete"));
        assertEquals(403, denied.status());
        assertEquals("FORBIDDEN", denied.<String>json("$.code"));
    }

    @Test
    void projectRolesAreIndependentOfWorkspaceRoles() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("PRoles"), "git"));
        UUID project = Fixtures.idOf(Fixtures.createProject(api(owner), ws, "P"));
        String url = Fixtures.projectUrl(ws, project) + "/roles";

        assertEquals(3, api(owner).get(url).<List<Object>>json("$").size());
        assertEquals(17, api(owner).get(url).<List<Integer>>json("$[?(@.name=='Owner')].permissions.length()").getFirst());

        Result created = api(owner).post(url, Fixtures.roleBody("Reviewer", "project.view", "pchat.read"));
        assertEquals(201, created.status());
        assertEquals("PROJECT", created.<String>json("$.scope"));
        assertEquals(3, api(owner).get(Fixtures.workspaceUrl(ws) + "/roles").<List<Object>>json("$").size());

        assertEquals(400, api(owner).post(url, Fixtures.roleBody("Mixed", "workspace.view")).status());
        UUID reviewer = UUID.fromString(created.<String>json("$.id"));
        assertEquals(403, api(owner).delete(url + "/" + Fixtures.projectRoleId(api(owner), ws, project, "Owner")).status());
        assertEquals(204, api(owner).delete(url + "/" + reviewer).status());
    }
}
