package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.auth.entity.UserEntity;
import com.orbit.chat.service.ChatBroadcaster;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@RequiresDocker
class ChatChannelCrudTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;
    @MockitoBean private ChatBroadcaster broadcaster;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    @Test
    void channelCrudRbacDeleteAndVoiceSeed() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Channels"), "chat"));
        addWorkspaceMember(ws, member, "Member");
        String baseUrl = Fixtures.workspaceUrl(ws) + "/chat/channels";

        Result defaultList = api(owner).get(baseUrl);
        assertEquals(1, defaultList.<List<Object>>json("$").size());
        UUID generalId = UUID.fromString(defaultList.json("$[0].id"));

        Result seededList = api(owner).get(baseUrl + "?seedVoice=true");
        assertEquals(2, seededList.<List<Object>>json("$").size());
        assertEquals("VOICE", seededList.<String>json("$[1].channelType"));
        assertEquals("lounge", seededList.<String>json("$[1].name"));

        assertEquals(403, api(member).post(baseUrl, "{\"name\":\"dev\",\"channelType\":\"TEXT\"}").status());

        Result created = api(owner).post(baseUrl,
            "{\"name\":\"Design Review\",\"description\":\"UI\",\"channelType\":\"TEXT\",\"category\":\"PRODUCT\"}");
        assertEquals(201, created.status());
        assertEquals("design-review", created.<String>json("$.name"));
        UUID customId = UUID.fromString(created.json("$.id"));

        assertEquals(409, api(owner).post(baseUrl, "{\"name\":\"Design Review\",\"channelType\":\"TEXT\"}").status());

        Result updated = api(owner).patch("/api/v1/chat/channels/" + customId,
            "{\"name\":\"Design Crit\",\"description\":\"Updated\"}");
        assertEquals(200, updated.status());
        assertEquals("design-crit", updated.<String>json("$.name"));
        assertEquals(403, api(member).patch("/api/v1/chat/channels/" + customId, "{\"description\":\"nope\"}").status());

        Result delGeneral = api(owner).delete("/api/v1/chat/channels/" + generalId);
        assertEquals(204, delGeneral.status());

        assertEquals(204, api(owner).delete("/api/v1/chat/channels/" + customId).status());
    }

    @Test
    void messageReplyAttachmentsDeleteRbacAndVoiceLifecycle() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Voice"), "chat"));
        addWorkspaceMember(ws, member, "Member");

        Result list = api(owner).get(Fixtures.workspaceUrl(ws) + "/chat/channels?seedVoice=true");
        UUID textId = UUID.fromString(list.json("$[0].id"));
        UUID voiceId = UUID.fromString(list.json("$[1].id"));

        Result parent = api(owner).post("/api/v1/chat/channels/" + textId + "/messages", "{\"content\":\"Parent msg\"}");
        String parentId = parent.json("$.id");

        Result reply = api(member).post("/api/v1/chat/channels/" + textId + "/messages", """
            {"content":"Got it","replyToId":"%s","attachmentName":"doc.md","attachmentUrl":"https://orbit.test/doc.md"}
            """.formatted(parentId));
        assertEquals(201, reply.status());
        assertEquals(parentId, reply.<String>json("$.replyToId"));
        assertEquals("doc.md", reply.<String>json("$.attachmentName"));

        Result history = api(owner).get("/api/v1/chat/channels/" + textId + "/messages");
        assertEquals(parentId, history.<String>json("$.items[1].replyToId"));
        assertEquals("https://orbit.test/doc.md", history.<String>json("$.items[1].attachmentUrl"));

        assertEquals(403, api(member).delete("/api/v1/chat/channels/" + textId + "/messages/" + parentId).status());
        assertEquals(204, api(owner).delete("/api/v1/chat/channels/" + textId + "/messages/" + reply.<String>json("$.id")).status());

        assertEquals(400, api(owner).post("/api/v1/chat/channels/" + textId + "/voice/join", "{}").status());
        Result joined = api(owner).post("/api/v1/chat/channels/" + voiceId + "/voice/join",
            "{\"muted\":false,\"deafened\":false,\"cameraOn\":true,\"screenSharing\":false,\"speaking\":false}");
        assertEquals(200, joined.status());
        assertEquals(1, joined.<List<Object>>json("$").size());

        Result updated = api(owner).put("/api/v1/chat/channels/" + voiceId + "/voice/state",
            "{\"muted\":false,\"deafened\":true,\"cameraOn\":false,\"screenSharing\":true,\"speaking\":false}");
        assertTrue(updated.<Boolean>json("$[0].muted"));
        assertTrue(updated.<Boolean>json("$[0].screenSharing"));

        assertEquals(204, api(owner).post("/api/v1/chat/channels/" + voiceId + "/voice/signal",
            "{\"type\":\"SCREEN_SHARE_STARTED\"}").status());
        assertTrue(api(owner).post("/api/v1/chat/channels/" + voiceId + "/voice/leave").<List<Object>>json("$").isEmpty());
    }
}
