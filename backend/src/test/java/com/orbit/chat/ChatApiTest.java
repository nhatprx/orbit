package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.orbit.auth.entity.UserEntity;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.service.ChatBroadcaster;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import com.orbit.workspace.entity.WorkspaceMemberEntity;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@RequiresDocker
class ChatApiTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;
    @MockitoBean private ChatBroadcaster broadcaster;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    private static String message(String content) {
        return "{\"content\":\"" + content + "\"}";
    }

    private UUID workspaceChannel(ApiClient api, UUID ws) {
        return UUID.fromString(api.get(Fixtures.workspaceUrl(ws) + "/chat/channels").<String>json("$[0].id"));
    }

    @Test
    void workspaceChannelIsSeededAndMessagesPersistAndBroadcast() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Chat"), "git", "chat"));

        Result channels = api(owner).get(Fixtures.workspaceUrl(ws) + "/chat/channels");
        assertEquals(200, channels.status());
        assertEquals(1, channels.<List<Object>>json("$").size());
        assertEquals("general", channels.<String>json("$[0].name"));
        assertEquals("WORKSPACE", channels.<String>json("$[0].scopeType"));
        UUID channel = UUID.fromString(channels.json("$[0].id"));
        assertEquals(channel.toString(), api(owner).get(Fixtures.workspaceUrl(ws) + "/chat/channels").<String>json("$[0].id"));

        Result sent = api(owner).post("/api/v1/chat/channels/" + channel + "/messages", message("  hello team  "));
        assertEquals(201, sent.status());
        assertEquals("hello team", sent.<String>json("$.content"));
        assertEquals(owner.getUsername(), sent.<String>json("$.senderUsername"));

        ArgumentCaptor<ChatMessageDto> captor = ArgumentCaptor.forClass(ChatMessageDto.class);
        verify(broadcaster, times(1)).broadcast(captor.capture());
        assertEquals(sent.<String>json("$.id"), captor.getValue().id().toString());

        Result history = api(owner).get("/api/v1/chat/channels/" + channel + "/messages");
        assertEquals(1, history.<List<Object>>json("$.items").size());
        assertFalse(history.<Boolean>json("$.hasMore"));
    }

    @Test
    void historyIsChronologicalAndCursorPaginatedNewestFirst() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Pages"), "chat"));
        UUID channel = workspaceChannel(api(owner), ws);
        for (int i = 1; i <= 5; i++) {
            api(owner).post("/api/v1/chat/channels/" + channel + "/messages", message("m" + i));
        }
        String url = "/api/v1/chat/channels/" + channel + "/messages?limit=2";

        Result first = api(owner).get(url);
        assertEquals(List.of("m4", "m5"), first.<List<String>>json("$.items[*].content"));
        assertTrue(first.<Boolean>json("$.hasMore"));
        assertEquals(2, first.<Integer>json("$.limit"));

        Result second = api(owner).get(url + "&cursor=" + first.<String>json("$.nextCursor"));
        assertEquals(List.of("m2", "m3"), second.<List<String>>json("$.items[*].content"));

        Result last = api(owner).get(url + "&cursor=" + second.<String>json("$.nextCursor"));
        assertEquals(List.of("m1"), last.<List<String>>json("$.items[*].content"));
        assertFalse(last.<Boolean>json("$.hasMore"));
        assertNull(last.<String>json("$.nextCursor"));

        assertEquals(400, api(owner).get(url + "&cursor=garbage").status());
        assertEquals(100, api(owner).get("/api/v1/chat/channels/" + channel + "/messages?limit=5000").<Integer>json("$.limit"));
    }

    @Test
    void messageContentIsValidated() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Valid"), "chat"));
        String url = "/api/v1/chat/channels/" + workspaceChannel(api(owner), ws) + "/messages";

        assertEquals(400, api(owner).post(url, message("   ")).status());
        assertEquals(400, api(owner).post(url, "{}").status());
        assertEquals(400, api(owner).post(url, message("x".repeat(4001))).status());
        assertEquals(201, api(owner).post(url, message("x".repeat(4000))).status());
        assertEquals(404, api(owner).get("/api/v1/chat/channels/" + UUID.randomUUID() + "/messages").status());
    }

    @Test
    void accessFollowsModuleStateAndChatPermissionKeys() {
        UserEntity owner = newUser("owner");
        UserEntity reader = newUser("reader");
        UserEntity stranger = newUser("stranger");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Access"), "chat"));
        UUID readerRole = UUID.fromString(api(owner).post(Fixtures.workspaceUrl(ws) + "/roles",
            Fixtures.roleBody("Reader", "workspace.view", "chat.read")).<String>json("$.id"));
        workspaceMembers.save(new WorkspaceMemberEntity(ws, reader.getId(), readerRole));
        UUID channel = workspaceChannel(api(owner), ws);
        String url = "/api/v1/chat/channels/" + channel + "/messages";
        api(owner).post(url, message("first"));

        assertEquals(200, api(reader).get(url).status());
        assertEquals(403, api(reader).post(url, message("nope")).status());
        assertEquals(404, api(stranger).get(url).status());
        assertEquals(404, api(stranger).get(Fixtures.workspaceUrl(ws) + "/chat/channels").status());

        api(owner).put(Fixtures.workspaceUrl(ws) + "/modules/chat", "{\"enabled\":false}");
        Result disabled = api(owner).get(url);
        assertEquals(403, disabled.status());
        assertEquals("MODULE_DISABLED", disabled.<String>json("$.code"));
        assertEquals(403, api(owner).get(Fixtures.workspaceUrl(ws) + "/chat/channels").status());

        api(owner).put(Fixtures.workspaceUrl(ws) + "/modules/chat", "{\"enabled\":true}");
        assertEquals(1, api(owner).get(url).<List<Object>>json("$.items").size());
    }

    @Test
    void projectChatIsScopedToProjectMembersAndProjectModules() {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UserEntity outsider = newUser("outsider");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("PChat"), "chat"));
        addWorkspaceMember(ws, member, "Member");
        addWorkspaceMember(ws, outsider, "Member");
        UUID project = Fixtures.idOf(Fixtures.createProject(api(owner), ws, "P"));
        addProjectMember(project, member, "Member");
        String channelsUrl = Fixtures.projectUrl(ws, project) + "/chat/channels";

        Result channels = api(owner).get(channelsUrl);
        assertEquals("PROJECT", channels.<String>json("$[0].scopeType"));
        assertEquals(project.toString(), channels.<String>json("$[0].scopeId"));
        String url = "/api/v1/chat/channels/" + channels.<String>json("$[0].id") + "/messages";

        assertEquals(201, api(member).post(url, message("hi from member")).status());
        assertEquals(200, api(owner).get(url).status());
        assertEquals(404, api(outsider).get(url).status());
        assertEquals(404, api(outsider).get(channelsUrl).status());

        api(owner).put(Fixtures.projectUrl(ws, project) + "/modules/chat", "{\"enabled\":false}");
        assertEquals("MODULE_DISABLED", api(member).get(url).<String>json("$.code"));
        api(owner).put(Fixtures.projectUrl(ws, project) + "/modules/chat", "{\"enabled\":true}");
        assertEquals(1, api(member).get(url).<List<Object>>json("$.items").size());
    }

    @Test
    void workspaceCreationWithoutChatModuleSeedsNoChannel() {
        UserEntity owner = newUser("owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("NoChat"), "git"));
        assertEquals(403, api(owner).get(Fixtures.workspaceUrl(ws) + "/chat/channels").status());
        verify(broadcaster, times(0)).broadcast(any());
    }
}
