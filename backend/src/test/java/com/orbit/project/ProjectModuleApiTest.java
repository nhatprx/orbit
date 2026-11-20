package com.orbit.project;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.auth.entity.UserEntity;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import com.orbit.workspace.permission.Permissions;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

@RequiresDocker
class ProjectModuleApiTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    private static String toggle(boolean enabled) {
        return "{\"enabled\":" + enabled + "}";
    }

    @Test
    void newProjectCopiesWorkspaceModulesAndCreatorOwnsIt() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Copy"), "git", "docs"));

        Result project = Fixtures.createProject(api(owner), ws, "Alpha Project");
        assertEquals(201, project.status());
        assertEquals(List.of("git", "docs"), project.<List<String>>json("$.enabledModules"));
        assertEquals(Permissions.PROJECT_KEYS.size(), project.<List<String>>json("$.myPermissions").size());
        assertEquals(1, project.<Integer>json("$.memberCount"));
        assertEquals("alpha-project", project.<String>json("$.slug"));
        assertEquals(1, api(owner).get(Fixtures.workspaceUrl(ws)).<Integer>json("$.projectCount"));
    }

    @Test
    void projectCanOnlyEnableModulesTheWorkspaceHasEnabled() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Rules"), "git"));
        UUID project = Fixtures.idOf(Fixtures.createProject(api(owner), ws, "P"));
        String url = Fixtures.projectUrl(ws, project) + "/modules/docs";

        Result blocked = api(owner).put(url, toggle(true));
        assertEquals(400, blocked.status());
        assertEquals("MODULE_NOT_ENABLED_IN_WORKSPACE", blocked.<String>json("$.code"));

        assertEquals(200, api(owner).put(Fixtures.workspaceUrl(ws) + "/modules/docs", toggle(true)).status());
        Result allowed = api(owner).put(url, toggle(true));
        assertEquals(200, allowed.status());
        assertTrue(allowed.<Boolean>json("$.effectiveEnabled"));
        assertEquals(404, api(owner).put(Fixtures.workspaceUrl(ws) + "/modules/ppt", toggle(true)).status());
        assertEquals(400, api(owner).put(url, "{}").status());
    }

    @Test
    void disablingWorkspaceModuleHidesItEverywhereWithoutLosingProjectState() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Cascade"), "git", "chat"));
        UUID project = Fixtures.idOf(Fixtures.createProject(api(owner), ws, "P"));
        String effective = Fixtures.workspaceUrl(ws) + "/effective-modules";

        Result before = api(owner).get(effective + "?projectId=" + project);
        assertEquals("PROJECT", before.<String>json("$.scope"));
        assertEquals(List.of("git", "chat"), before.<List<String>>json("$.modules[*].key"));

        Result counts = api(owner).get(Fixtures.workspaceUrl(ws) + "/modules");
        assertEquals(1, counts.<List<Integer>>json("$[?(@.key=='git')].activeProjectCount").getFirst());

        assertEquals(200, api(owner).put(Fixtures.workspaceUrl(ws) + "/modules/git", toggle(false)).status());
        Result hidden = api(owner).get(effective + "?projectId=" + project);
        assertEquals(List.of("chat"), hidden.<List<String>>json("$.modules[*].key"));
        assertEquals(List.of("chat"), api(owner).get(effective).<List<String>>json("$.modules[*].key"));

        Result projectView = api(owner).get(Fixtures.projectUrl(ws, project) + "/modules");
        assertFalse(projectView.<List<Boolean>>json("$[?(@.key=='git')].effectiveEnabled").getFirst());
        assertTrue(projectView.<List<Boolean>>json("$[?(@.key=='git')].enabledInProject").getFirst());

        api(owner).put(Fixtures.workspaceUrl(ws) + "/modules/git", toggle(true));
        Result restored = api(owner).get(effective + "?projectId=" + project);
        assertEquals(List.of("git", "chat"), restored.<List<String>>json("$.modules[*].key"));
    }

    @Test
    void plainMembersCannotToggleModulesButAdminsCan() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UserEntity admin = newUser("admin");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Perm"), "git"));
        addWorkspaceMember(ws, member, "Member");
        addWorkspaceMember(ws, admin, "Admin");
        String url = Fixtures.workspaceUrl(ws) + "/modules/docs";

        assertEquals(403, api(member).put(url, toggle(true)).status());
        assertEquals(200, api(admin).put(url, toggle(true)).status());
        assertEquals(403, api(member).put(url, toggle(false)).status());
    }

    @Test
    void projectVisibilityFollowsMembershipAndViewAllRules() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UserEntity admin = newUser("admin");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Vis"), "git"));
        addWorkspaceMember(ws, member, "Member");
        addWorkspaceMember(ws, admin, "Admin");
        UUID project = Fixtures.idOf(Fixtures.createProject(api(owner), ws, "Secret"));
        String url = Fixtures.projectUrl(ws, project);

        assertEquals(404, api(member).get(url).status());
        assertEquals(0, api(member).get(Fixtures.workspaceUrl(ws) + "/projects").<Integer>json("$.totalElements"));
        assertEquals(0, api(member).get("/api/v1/projects/mine").<Integer>json("$.totalElements"));

        Result adminView = api(admin).get(url);
        assertEquals(200, adminView.status());
        assertTrue(adminView.<List<String>>json("$.myPermissions").contains(Permissions.PROJECT_EDIT));
        assertEquals(200, api(admin).patch(url, "{\"name\":\"Edited\"}").status());
        assertEquals(1, api(admin).get("/api/v1/projects/mine").<Integer>json("$.totalElements"));

        addProjectMember(project, member, "Member");
        Result memberView = api(member).get(url);
        assertEquals(200, memberView.status());
        assertFalse(memberView.<List<String>>json("$.myPermissions").contains(Permissions.PROJECT_EDIT));
        assertEquals(403, api(member).patch(url, "{\"name\":\"Hax\"}").status());
        assertEquals(403, api(member).delete(url).status());
        assertEquals(1, api(member).get("/api/v1/projects/mine").<Integer>json("$.totalElements"));
        assertEquals("Edited", api(member).get("/api/v1/projects/mine").<String>json("$.items[0].name"));
    }

    @Test
    void deletedProjectsDisappearAndForeignProjectIdsAreNotFound() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Del"), "git"));
        UUID otherWs = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Other"), "git"));
        UUID project = Fixtures.idOf(Fixtures.createProject(api(owner), ws, "Temp"));

        assertEquals(404, api(owner).get(Fixtures.projectUrl(otherWs, project)).status());
        assertEquals(204, api(owner).delete(Fixtures.projectUrl(ws, project)).status());
        assertEquals(404, api(owner).get(Fixtures.projectUrl(ws, project)).status());
        assertEquals(0, api(owner).get(Fixtures.workspaceUrl(ws) + "/projects").<Integer>json("$.totalElements"));
        assertEquals(0, api(owner).get(Fixtures.workspaceUrl(ws)).<Integer>json("$.projectCount"));
    }
}
