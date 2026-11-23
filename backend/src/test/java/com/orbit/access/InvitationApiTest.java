package com.orbit.access;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.access.entity.InvitationEntity;
import com.orbit.access.repository.InvitationRepository;
import com.orbit.auth.entity.UserEntity;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

@RequiresDocker
class InvitationApiTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private InvitationRepository invitationRepository;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    private static String emailBody(String email) {
        return "{\"email\":\"" + email + "\"}";
    }

    @Test
    void emailInvitesDefaultToMemberRoleAndSevenDayExpiry() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Invite"), "git"));
        String url = Fixtures.workspaceUrl(ws) + "/invitations/email";

        Result created = api(owner).post(url, emailBody("New.Person@Example.com"));
        assertEquals(201, created.status());
        assertEquals("new.person@example.com", created.<String>json("$.email"));
        assertEquals("EMAIL", created.<String>json("$.type"));
        assertEquals("PENDING", created.<String>json("$.status"));
        assertEquals("Member", created.<String>json("$.roleName"));
        assertNotNull(created.<String>json("$.token"));
        Duration ttl = Duration.between(Instant.parse(created.<String>json("$.createdAt")),
            Instant.parse(created.<String>json("$.expiresAt")));
        assertTrue(ttl.minus(Duration.ofDays(7)).abs().compareTo(Duration.ofSeconds(5)) < 0, "ttl was " + ttl);

        Result duplicate = api(owner).post(url, emailBody("new.person@example.com"));
        assertEquals(409, duplicate.status());
        assertEquals("INVITATION_ALREADY_PENDING", duplicate.<String>json("$.code"));
        assertEquals(409, api(owner).post(url, emailBody(owner.getEmail())).status());
        assertEquals(404, api(owner).post(url, emailBody("not-an-email")).status());
        assertEquals(400, api(owner).post(url, emailBody("   ")).status());
    }

    @Test
    void inviteeInboxOnlyShowsTheirActiveEmailInvitations() {
        UserEntity owner = newUser("owner");
        UserEntity invited = newUser("invitee");
        UserEntity other = newUser("other");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Inbox"), "git"));
        Result created = api(owner).post(Fixtures.workspaceUrl(ws) + "/invitations/email", emailBody(invited.getEmail()));

        Result inbox = api(invited).get("/api/v1/invitations/inbox");
        assertEquals(200, inbox.status());
        assertEquals(1, inbox.<Integer>json("$.totalElements"));
        assertEquals(ws.toString(), inbox.<String>json("$.items[0].workspaceId"));
        assertNotNull(inbox.<String>json("$.items[0].workspaceName"));
        assertEquals(created.<String>json("$.token"), inbox.<String>json("$.items[0].token"));
        assertEquals(0, api(other).get("/api/v1/invitations/inbox").<Integer>json("$.totalElements"));
        assertEquals(200, api(invited).post("/api/v1/invitations/" + created.<String>json("$.token") + "/accept").status());
        assertEquals(0, api(invited).get("/api/v1/invitations/inbox").<Integer>json("$.totalElements"));
    }

    @Test
    void linksAreReusableTokensWithAnOptionalRole() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Link"), "git"));
        String url = Fixtures.workspaceUrl(ws) + "/invitations/link";

        Result link = api(owner).post(url, "{}");
        assertEquals(201, link.status());
        assertEquals("LINK", link.<String>json("$.type"));
        assertEquals("Member", link.<String>json("$.roleName"));
        assertEquals(201, api(owner).post(url).status());

        UUID adminRole = Fixtures.workspaceRoleId(api(owner), ws, "Admin");
        Result admin = api(owner).post(url, "{\"roleId\":\"" + adminRole + "\"}");
        assertEquals("Admin", admin.<String>json("$.roleName"));

        UUID ownerRole = Fixtures.workspaceRoleId(api(owner), ws, "Owner");
        assertEquals(400, api(owner).post(url, "{\"roleId\":\"" + ownerRole + "\"}").status());

        Result list = api(owner).get(Fixtures.workspaceUrl(ws) + "/invitations");
        assertEquals(3, list.<Integer>json("$.totalElements"));
    }

    @Test
    void onlyMembersWithInvitePermissionCanManageInvitations() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UserEntity inviter = newUser("inviter");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Perm"), "git"));
        addWorkspaceMember(ws, member, "Member");
        String base = Fixtures.workspaceUrl(ws);
        UUID inviterRole = UUID.fromString(api(owner).post(base + "/roles",
            Fixtures.roleBody("Inviter", "workspace.view", "member.invite")).<String>json("$.id"));
        workspaceMembers.save(new com.orbit.workspace.entity.WorkspaceMemberEntity(ws, inviter.getId(), inviterRole));
        UUID adminRole = Fixtures.workspaceRoleId(api(owner), ws, "Admin");

        assertEquals(403, api(member).get(base + "/invitations").status());
        assertEquals(403, api(member).post(base + "/invitations/link", "{}").status());
        assertEquals(201, api(inviter).post(base + "/invitations/link", "{}").status());
        Result escalate = api(inviter).post(base + "/invitations/link", "{\"roleId\":\"" + adminRole + "\"}");
        assertEquals(403, escalate.status());
    }

    @Test
    void revokeStopsALinkAndIsIdempotent() {
        UserEntity owner = newUser("owner");
        UserEntity joiner = newUser("joiner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Revoke"), "git"));
        Result link = api(owner).post(Fixtures.workspaceUrl(ws) + "/invitations/link", "{}");
        String id = link.json("$.id");
        String token = link.json("$.token");

        String revokeUrl = Fixtures.workspaceUrl(ws) + "/invitations/" + id;
        assertEquals(204, api(owner).delete(revokeUrl).status());
        assertEquals(204, api(owner).delete(revokeUrl).status());
        assertEquals(404, api(owner).delete(Fixtures.workspaceUrl(ws) + "/invitations/" + UUID.randomUUID()).status());

        Result accept = api(joiner).post("/api/v1/invitations/" + token + "/accept");
        assertEquals(410, accept.status());
        assertEquals("INVITATION_REVOKED", accept.<String>json("$.code"));
        assertEquals("REVOKED", api(owner).get(Fixtures.workspaceUrl(ws) + "/invitations").<String>json("$.items[0].status"));
    }

    @Test
    void expiredInvitationsReadAsExpiredAndCannotBeAccepted() throws Exception {
        UserEntity owner = newUser("owner");
        UserEntity joiner = newUser("joiner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Expire"), "git"));
        Result link = api(owner).post(Fixtures.workspaceUrl(ws) + "/invitations/link", "{}");
        InvitationEntity entity = invitationRepository.findById(UUID.fromString(link.json("$.id"))).orElseThrow();
        entity.setExpiresAt(Instant.now().minusSeconds(5));
        invitationRepository.save(entity);

        Result accept = api(joiner).post("/api/v1/invitations/" + entity.getToken() + "/accept");
        assertEquals(410, accept.status());
        assertEquals("INVITATION_EXPIRED", accept.<String>json("$.code"));

        var preview = mvc.perform(MockMvcRequestBuilders.get("/api/v1/invitations/" + entity.getToken()))
            .andReturn().getResponse();
        assertEquals(200, preview.getStatus());
        assertTrue(preview.getContentAsString().contains("\"status\":\"EXPIRED\""));
        assertEquals("EXPIRED", api(owner).get(Fixtures.workspaceUrl(ws) + "/invitations").<String>json("$.items[0].status"));
    }

    @Test
    void wizardInviteEmailsBecomePendingInvitations() {
        UserEntity owner = newUser("owner");
        Result created = api(owner).post("/api/v1/workspaces", """
            {"name":"%s","moduleKeys":["git"],"inviteEmails":["A@x.com","a@x.com","b@x.com"]}
            """.formatted(Fixtures.unique("Wizard")));
        assertEquals(201, created.status());
        UUID ws = Fixtures.idOf(created);

        Result list = api(owner).get(Fixtures.workspaceUrl(ws) + "/invitations");
        assertEquals(2, list.<Integer>json("$.totalElements"));
        Result unknown = api(owner).post("/api/v1/workspaces", """
            {"name":"Bad","moduleKeys":["git"],"inviteEmails":["nope"]}
            """);
        assertEquals(404, unknown.status());
        assertEquals("USER_NOT_FOUND", unknown.<String>json("$.code"));
    }
}
