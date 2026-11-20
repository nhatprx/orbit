package com.orbit.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.auth.entity.UserEntity;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import com.orbit.workspace.entity.BaseRoleEntity;
import com.orbit.workspace.entity.RoleScope;
import com.orbit.workspace.entity.WorkspaceRoleEntity;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.repository.RolePermissionRepository;
import com.orbit.workspace.repository.WorkspaceRoleRepository;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

@RequiresDocker
class WorkspaceCreationApiTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private WorkspaceRoleRepository roles;
    @Autowired private RolePermissionRepository rolePermissions;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    @Test
    void createSeedsOwnerSystemRolesAndSelectedModules() {
        UserEntity owner = newUser("owner");
        Result res = Fixtures.createWorkspace(api(owner), Fixtures.unique("Acme"), "git", "chat");

        assertEquals(201, res.status());
        assertEquals(owner.getId().toString(), res.<String>json("$.ownerId"));
        assertEquals(List.of("git", "chat"), res.<List<String>>json("$.enabledModules"));
        assertEquals(Permissions.WORKSPACE_KEYS.size(), res.<List<String>>json("$.myPermissions").size());
        assertEquals(1, res.<Integer>json("$.memberCount"));
        assertEquals(0, res.<Integer>json("$.projectCount"));

        UUID id = Fixtures.idOf(res);
        List<WorkspaceRoleEntity> seeded = roles.findByWorkspaceIdOrderByCreatedAtAsc(id);
        assertEquals(
            Set.of("Owner", "Admin", "Member"),
            seeded.stream().map(BaseRoleEntity::getName).collect(Collectors.toSet())
        );
        WorkspaceRoleEntity owners = roles.findByWorkspaceIdAndNameIgnoreCase(id, "Owner").orElseThrow();
        WorkspaceRoleEntity admins = roles.findByWorkspaceIdAndNameIgnoreCase(id, "Admin").orElseThrow();
        WorkspaceRoleEntity members = roles.findByWorkspaceIdAndNameIgnoreCase(id, "Member").orElseThrow();
        assertTrue(owners.isImmutable());
        assertFalse(admins.isImmutable());
        assertEquals(20, rolePermissions.findKeys(owners.getId(), RoleScope.WORKSPACE).size());
        Set<String> adminKeys = rolePermissions.findKeys(admins.getId(), RoleScope.WORKSPACE);
        assertEquals(18, adminKeys.size());
        assertFalse(adminKeys.contains(Permissions.WORKSPACE_DELETE));
        assertFalse(adminKeys.contains(Permissions.WORKSPACE_TRANSFER_OWNER));
        assertEquals(6, rolePermissions.findKeys(members.getId(), RoleScope.WORKSPACE).size());
    }

    @Test
    void createRejectsMissingOrUnknownModulesAndBadInput() {
        ApiClient api = api(newUser("owner"));

        Result none = api.post("/api/v1/workspaces", "{\"name\":\"Empty\",\"moduleKeys\":[]}");
        assertEquals(400, none.status());
        assertEquals("VALIDATION_ERROR", none.<String>json("$.code"));

        Result unknown = Fixtures.createWorkspace(api, Fixtures.unique("Bad"), "git", "ppt");
        assertEquals(400, unknown.status());

        Result blank = api.post("/api/v1/workspaces", "{\"name\":\"   \",\"moduleKeys\":[\"git\"]}");
        assertEquals(400, blank.status());

        Result badAvatar = api.post("/api/v1/workspaces", """
            {"name":"Avatar %s","avatarUrl":"javascript:alert(1)","moduleKeys":["git"]}
            """.formatted(UUID.randomUUID()));
        assertEquals(400, badAvatar.status());

        assertEquals(400, api.post("/api/v1/workspaces", "{not json").status());
    }

    @Test
    void sameNameWorkspacesGetDistinctSlugs() {
        ApiClient api = api(newUser("owner"));
        String name = Fixtures.unique("Dup");
        Result first = Fixtures.createWorkspace(api, name, "git");
        Result second = Fixtures.createWorkspace(api, name, "git");
        assertEquals(201, second.status());
        assertFalse(first.<String>json("$.slug").equals(second.<String>json("$.slug")));
    }

    @Test
    void nonMembersCannotSeeAWorkspaceAndListIsScopedToMembership() {
        UserEntity owner = newUser("owner");
        UserEntity stranger = newUser("stranger");
        UUID id = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Private"), "git"));

        Result probe = api(stranger).get(Fixtures.workspaceUrl(id));
        assertEquals(404, probe.status());
        assertEquals("NOT_FOUND", probe.<String>json("$.code"));

        assertEquals(0, api(stranger).get("/api/v1/workspaces").<Integer>json("$.totalElements"));
        assertEquals(1, api(owner).get("/api/v1/workspaces").<Integer>json("$.totalElements"));
        assertEquals(404, api(stranger).get(Fixtures.workspaceUrl(UUID.randomUUID())).status());
        assertEquals(400, api(owner).get("/api/v1/workspaces/not-a-uuid").status());
    }

    @Test
    void ownerEditsFieldsAndPaginationIsBounded() {
        UserEntity owner = newUser("owner");
        UUID id = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Edit"), "git"));

        Result patched = api(owner).patch(Fixtures.workspaceUrl(id), """
            {"name":"Renamed","description":"New text","avatarUrl":"https://example.com/a.png"}
            """);
        assertEquals(200, patched.status());
        assertEquals("Renamed", patched.<String>json("$.name"));
        assertEquals("https://example.com/a.png", patched.<String>json("$.avatarUrl"));

        assertEquals(400, api(owner).patch(Fixtures.workspaceUrl(id), "{\"name\":\"  \"}").status());

        Result page = api(owner).get("/api/v1/workspaces?page=0&size=1000");
        assertEquals(100, page.<Integer>json("$.size"));
    }
}
