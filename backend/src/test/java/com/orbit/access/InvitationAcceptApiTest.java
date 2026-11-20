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
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

@RequiresDocker
class InvitationAcceptApiTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    private static String accept(String token) {
        return "/api/v1/invitations/" + token + "/accept";
    }

    @Test
    void previewIsPublicAndRevealsOnlyInviteMetadata() throws Exception {
        UserEntity owner = newUser("owner");
        String name = Fixtures.unique("Preview");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), name, "git"));
        String token = api(owner).post(Fixtures.workspaceUrl(ws) + "/invitations/link", "{}").json("$.token");

        var ok = mvc.perform(MockMvcRequestBuilders.get("/api/v1/invitations/" + token)).andReturn().getResponse();
        assertEquals(200, ok.getStatus());
        assertTrue(ok.getContentAsString().contains("\"workspaceName\":\"" + name + "\""));
        assertTrue(ok.getContentAsString().contains("\"roleName\":\"Member\""));
        assertFalse(ok.getContentAsString().contains("ownerId"));

        var missing = mvc.perform(MockMvcRequestBuilders.get("/api/v1/invitations/unknown-token")).andReturn().getResponse();
        assertEquals(404, missing.getStatus());
        var unauthenticatedAccept = mvc.perform(MockMvcRequestBuilders.post(accept(token))).andReturn().getResponse();
        assertEquals(401, unauthenticatedAccept.getStatus());
    }

    @Test
    void linkAcceptJoinsAsMemberAndLinksStayReusable() {
        UserEntity owner = newUser("owner");
        UserEntity first = newUser("first");
        UserEntity second = newUser("second");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Join"), "git"));
        String token = api(owner).post(Fixtures.workspaceUrl(ws) + "/invitations/link", "{}").json("$.token");

        Result joined = api(first).post(accept(token));
        assertEquals(200, joined.status());
        assertEquals(ws.toString(), joined.<String>json("$.workspaceId"));
        assertEquals("Member", joined.<String>json("$.roleName"));
        assertFalse(joined.<Boolean>json("$.alreadyMember"));
        assertEquals(200, api(first).get(Fixtures.workspaceUrl(ws)).status());

        assertTrue(api(first).post(accept(token)).<Boolean>json("$.alreadyMember"));
        assertEquals(200, api(second).post(accept(token)).status());
        assertEquals(3, api(owner).get(Fixtures.workspaceUrl(ws) + "/members").<Integer>json("$.totalElements"));
    }

    @Test
    void emailInviteIsSingleUseAndBoundToTheInvitedAddress() {
        UserEntity owner = newUser("owner");
        UserEntity invitee = newUser("invitee");
        UserEntity other = newUser("other");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Email"), "git"));
        Result invite = api(owner).post(Fixtures.workspaceUrl(ws) + "/invitations/email",
            "{\"email\":\"" + invitee.getEmail() + "\"}");
        String token = invite.json("$.token");

        Result wrongUser = api(other).post(accept(token));
        assertEquals(403, wrongUser.status());
        assertEquals("INVITATION_EMAIL_MISMATCH", wrongUser.<String>json("$.code"));
        assertEquals(404, api(other).get(Fixtures.workspaceUrl(ws)).status());

        assertEquals(200, api(invitee).post(accept(token)).status());
        Result reuse = api(invitee).post(accept(token));
        assertEquals(409, reuse.status());
        assertEquals("INVITATION_ALREADY_USED", reuse.<String>json("$.code"));
        assertEquals("ACCEPTED", api(owner).get(Fixtures.workspaceUrl(ws) + "/invitations").<String>json("$.items[0].status"));
    }

    @Test
    void declineMarksEmailInvitesAndRejectsLinks() {
        UserEntity owner = newUser("owner");
        UserEntity invitee = newUser("invitee");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Decline"), "git"));
        String emailToken = api(owner).post(Fixtures.workspaceUrl(ws) + "/invitations/email",
            "{\"email\":\"" + invitee.getEmail() + "\"}").json("$.token");
        String linkToken = api(owner).post(Fixtures.workspaceUrl(ws) + "/invitations/link", "{}").json("$.token");

        assertEquals(400, api(invitee).post("/api/v1/invitations/" + linkToken + "/decline").status());
        assertEquals(204, api(invitee).post("/api/v1/invitations/" + emailToken + "/decline").status());
        assertEquals(409, api(invitee).post(accept(emailToken)).status());
        assertEquals(404, api(invitee).get(Fixtures.workspaceUrl(ws)).status());
    }

    @Test
    void projectInvitesJoinTheWorkspaceAsMemberAndTheProjectWithTheChosenRole() {
        UserEntity owner = newUser("owner");
        UserEntity joiner = newUser("joiner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("ProjectInvite"), "git"));
        UUID project = Fixtures.idOf(Fixtures.createProject(api(owner), ws, "P"));
        UUID adminRole = Fixtures.projectRoleId(api(owner), ws, project, "Admin");

        Result link = api(owner).post(Fixtures.workspaceUrl(ws) + "/invitations/link",
            "{\"projectId\":\"" + project + "\",\"roleId\":\"" + adminRole + "\"}");
        assertEquals(201, link.status());
        assertEquals("Admin", link.<String>json("$.roleName"));

        Result joined = api(joiner).post(accept(link.json("$.token")));
        assertEquals(200, joined.status());
        assertEquals(project.toString(), joined.<String>json("$.projectId"));
        assertEquals("Admin", joined.<String>json("$.roleName"));

        Result members = api(owner).get(Fixtures.projectUrl(ws, project) + "/members");
        assertEquals("Admin", members.<java.util.List<String>>json("$.items[?(@.userId=='" + joiner.getId() + "')].roleName").getFirst());
        Result workspaceMember = api(owner).get(Fixtures.workspaceUrl(ws) + "/members");
        assertEquals("Member", workspaceMember.<java.util.List<String>>json("$.items[?(@.userId=='" + joiner.getId() + "')].roleName").getFirst());

        Result wrongScope = api(owner).post(Fixtures.workspaceUrl(ws) + "/invitations/link",
            "{\"projectId\":\"" + project + "\",\"roleId\":\"" + Fixtures.workspaceRoleId(api(owner), ws, "Member") + "\"}");
        assertEquals(404, wrongScope.status());
        assertEquals("ROLE_NOT_FOUND", wrongScope.<String>json("$.code"));
    }

    @Test
    void invitationsToDeletedWorkspacesAreGone() {
        UserEntity owner = newUser("owner");
        UserEntity joiner = newUser("joiner");
        String name = Fixtures.unique("Gone");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), name, "git"));
        String token = api(owner).post(Fixtures.workspaceUrl(ws) + "/invitations/link", "{}").json("$.token");
        api(owner).delete(Fixtures.workspaceUrl(ws), "{\"confirmName\":\"" + name + "\"}");

        assertEquals(404, api(joiner).post(accept(token)).status());
    }
}
