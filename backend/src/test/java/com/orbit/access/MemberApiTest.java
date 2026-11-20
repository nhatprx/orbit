package com.orbit.access;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
class MemberApiTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    private static String role(UUID roleId) {
        return "{\"roleId\":\"" + roleId + "\"}";
    }

    @Test
    void listShowsOwnerFlagAndPagination() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Members"), "git"));
        addWorkspaceMember(ws, member, "Member");

        Result list = api(owner).get(Fixtures.workspaceUrl(ws) + "/members");
        assertEquals(200, list.status());
        assertEquals(2, list.<Integer>json("$.totalElements"));
        assertEquals(List.of(true), list.<List<Boolean>>json("$.items[?(@.roleName=='Owner')].isOwner"));
        assertEquals(List.of(false), list.<List<Boolean>>json("$.items[?(@.roleName=='Member')].isOwner"));
        assertEquals(1, api(owner).get(Fixtures.workspaceUrl(ws) + "/members?size=1").<List<Object>>json("$.items").size());
        assertEquals(404, api(newUser("stranger")).get(Fixtures.workspaceUrl(ws) + "/members").status());
    }

    @Test
    void ownerCannotBeReassignedOrRemovedAndOwnerRoleCannotBeAssigned() {
        UserEntity owner = newUser("owner");
        UserEntity admin = newUser("admin");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Owner"), "git"));
        addWorkspaceMember(ws, admin, "Admin");
        String base = Fixtures.workspaceUrl(ws) + "/members/";
        UUID adminRole = Fixtures.workspaceRoleId(api(owner), ws, "Admin");
        UUID ownerRole = Fixtures.workspaceRoleId(api(owner), ws, "Owner");

        Result demote = api(admin).patch(base + owner.getId() + "/role", role(adminRole));
        assertEquals(409, demote.status());
        assertEquals("OWNER_TRANSFER_REQUIRED", demote.<String>json("$.code"));
        assertEquals(409, api(owner).patch(base + admin.getId() + "/role", role(ownerRole)).status());
        assertEquals(409, api(owner).delete(base + owner.getId()).status());
        assertEquals("OWNER_TRANSFER_REQUIRED", api(admin).delete(base + owner.getId()).<String>json("$.code"));
    }

    @Test
    void membersCanLeaveButCannotRemoveOthersWithoutPermission() {
        UserEntity owner = newUser("owner");
        UserEntity alice = newUser("alice");
        UserEntity bob = newUser("bob");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Leave"), "git"));
        addWorkspaceMember(ws, alice, "Member");
        addWorkspaceMember(ws, bob, "Member");
        String base = Fixtures.workspaceUrl(ws) + "/members/";

        assertEquals(403, api(alice).delete(base + bob.getId()).status());
        assertEquals(204, api(alice).delete(base + alice.getId()).status());
        assertEquals(404, api(alice).get(Fixtures.workspaceUrl(ws)).status());
        assertEquals(204, api(owner).delete(base + bob.getId()).status());
        assertEquals(404, api(owner).delete(base + bob.getId()).status());
        assertEquals(1, api(owner).get(Fixtures.workspaceUrl(ws) + "/members").<Integer>json("$.totalElements"));
    }

    @Test
    void moderatorsCannotActOnMembersWhoOutrankThem() {
        UserEntity owner = newUser("owner");
        UserEntity mod = newUser("mod");
        UserEntity admin = newUser("admin");
        UserEntity plain = newUser("plain");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Outrank"), "git"));
        String base = Fixtures.workspaceUrl(ws);
        UUID modRole = UUID.fromString(api(owner).post(base + "/roles", Fixtures.roleBody(
            "Moderator", "workspace.view", "member.view", "role.view", "project.create",
            "chat.read", "chat.write", "member.remove", "member.assign_role"
        )).<String>json("$.id"));
        addWorkspaceMember(ws, admin, "Admin");
        addWorkspaceMember(ws, plain, "Member");
        workspaceMembers.save(new com.orbit.workspace.entity.WorkspaceMemberEntity(ws, mod.getId(), modRole));
        UUID adminRole = Fixtures.workspaceRoleId(api(owner), ws, "Admin");

        assertEquals(403, api(mod).delete(base + "/members/" + admin.getId()).status());
        assertEquals(403, api(mod).patch(base + "/members/" + plain.getId() + "/role", role(adminRole)).status());
        assertEquals(204, api(mod).delete(base + "/members/" + plain.getId()).status());
    }

    @Test
    void removingAWorkspaceMemberAlsoRemovesTheirProjectMemberships() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Cascade"), "git"));
        UUID project = Fixtures.idOf(Fixtures.createProject(api(owner), ws, "P"));
        addWorkspaceMember(ws, member, "Member");
        addProjectMember(project, member, "Member");

        assertEquals(2, api(owner).get(Fixtures.projectUrl(ws, project) + "/members").<Integer>json("$.totalElements"));
        assertEquals(204, api(owner).delete(Fixtures.workspaceUrl(ws) + "/members/" + member.getId()).status());
        assertEquals(1, api(owner).get(Fixtures.projectUrl(ws, project) + "/members").<Integer>json("$.totalElements"));
    }

    @Test
    void projectMembershipRulesAndLastOwnerProtection() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UserEntity outsider = newUser("outsider");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("PMembers"), "git"));
        UUID project = Fixtures.idOf(Fixtures.createProject(api(owner), ws, "P"));
        addWorkspaceMember(ws, member, "Member");
        String base = Fixtures.projectUrl(ws, project) + "/members";
        UUID memberRole = Fixtures.projectRoleId(api(owner), ws, project, "Member");
        UUID ownerRole = Fixtures.projectRoleId(api(owner), ws, project, "Owner");
        UUID adminRole = Fixtures.projectRoleId(api(owner), ws, project, "Admin");

        String addMember = "{\"userId\":\"%s\",\"roleId\":\"%s\"}";
        Result notInWorkspace = api(owner).post(base, addMember.formatted(outsider.getId(), memberRole));
        assertEquals(400, notInWorkspace.status());
        assertEquals("NOT_WORKSPACE_MEMBER", notInWorkspace.<String>json("$.code"));
        assertEquals(201, api(owner).post(base, addMember.formatted(member.getId(), memberRole)).status());
        assertEquals(409, api(owner).post(base, addMember.formatted(member.getId(), memberRole)).status());
        assertEquals(403, api(member).post(base, addMember.formatted(owner.getId(), memberRole)).status());

        assertEquals("Admin", api(owner).patch(base + "/" + member.getId() + "/role", role(adminRole)).<String>json("$.roleName"));

        Result lastOwner = api(owner).patch(base + "/" + owner.getId() + "/role", role(memberRole));
        assertEquals(409, lastOwner.status());
        assertEquals("LAST_PROJECT_OWNER", lastOwner.<String>json("$.code"));
        assertEquals(409, api(owner).delete(base + "/" + owner.getId()).status());

        api(owner).patch(base + "/" + member.getId() + "/role", role(ownerRole));
        assertEquals(204, api(owner).delete(base + "/" + owner.getId()).status());
        assertFalse(api(owner).get(base).<List<String>>json("$.items[*].userId").contains(owner.getId().toString()));
        assertTrue(api(member).get(base).<Integer>json("$.totalElements") == 1);
    }
}
