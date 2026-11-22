package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.service.JwtService;
import com.orbit.auth.service.RedisSessionService;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.SendChatMessageRequest;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import com.orbit.support.StompTestClient;
import com.orbit.support.StompTestClient.Recorder;
import com.orbit.workspace.entity.WorkspaceMemberEntity;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Drives the real STOMP endpoint over a native WebSocket on a random port. */
@RequiresDocker
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "orbit.workspace.purge.enabled=false",
        "orbit.chat.redis.enabled=false",
        "orbit.cors.allowed-origins=http://localhost:5173"
    }
)
class ChatStompTest extends AbstractIntegrationTest {

    @LocalServerPort private int port;
    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwtService;
    @Autowired private ObjectMapper mapper;
    @MockitoBean private RedisSessionService sessions;

    private StompTestClient stomp;

    @BeforeEach
    void setUp() {
        stomp = new StompTestClient(port, mapper);
        when(sessions.isSessionActive(anyString())).thenReturn(true);
    }

    private StompSession connect(UserEntity user, Recorder recorder) throws Exception {
        return stomp.connect("Bearer " + jwtService.issueToken(user, 600).token(), recorder);
    }

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    private UUID channelOf(UserEntity owner, UUID ws) {
        return UUID.fromString(api(owner).get(Fixtures.workspaceUrl(ws) + "/chat/channels").json("$[0].id"));
    }

    @Test
    void authenticatedMembersSendAndReceiveMessagesInRealTime() throws Exception {
        UserEntity owner = newUser("owner");
        UserEntity member = newUser("member");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Live"), "chat"));
        addWorkspaceMember(ws, member, "Member");
        UUID channel = channelOf(owner, ws);

        StompSession ownerSession = connect(owner, new Recorder());
        StompSession memberSession = connect(member, new Recorder());
        BlockingQueue<ChatMessageDto> ownerInbox =
            StompTestClient.subscribe(ownerSession, "/topic/chat." + channel, ChatMessageDto.class);
        BlockingQueue<ChatMessageDto> memberInbox =
            StompTestClient.subscribe(memberSession, "/topic/chat." + channel, ChatMessageDto.class);
        Thread.sleep(300);

        memberSession.send("/app/chat." + channel + ".send", new SendChatMessageRequest("hello over stomp"));

        ChatMessageDto atOwner = ownerInbox.poll(5, TimeUnit.SECONDS);
        assertNotNull(atOwner);
        assertNotNull(memberInbox.poll(5, TimeUnit.SECONDS));
        assertEquals("hello over stomp", atOwner.content());
        assertEquals(member.getUsername(), atOwner.senderUsername());
        assertEquals(channel, atOwner.channelId());
        assertTrue(api(owner).get("/api/v1/chat/channels/" + channel + "/messages").body().contains("hello over stomp"));
        ownerSession.disconnect();
        memberSession.disconnect();
    }

    @Test
    void connectionsWithoutAValidTokenAreRejected() {
        assertThrows(Exception.class, () -> stomp.connect(null, new Recorder()));
        assertThrows(Exception.class, () -> stomp.connect("Bearer not-a-jwt", new Recorder()));

        UserEntity ghost = new UserEntity();
        ghost.setId(UUID.randomUUID());
        ghost.setUsername("ghost");
        ghost.setEmail("ghost@orbit.test");
        String token = jwtService.issueToken(ghost, 600).token();
        when(sessions.isSessionActive(anyString())).thenReturn(false);
        ExecutionException revoked =
            assertThrows(ExecutionException.class, () -> stomp.connect("Bearer " + token, new Recorder()));
        assertNotNull(revoked.getCause());
    }

    @Test
    void subscribingToAChannelYouCannotReadIsDenied() throws Exception {
        UserEntity owner = newUser("owner");
        UserEntity stranger = newUser("stranger");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Deny"), "chat"));
        UUID channel = channelOf(owner, ws);

        Recorder recorder = new Recorder();
        StompSession session = connect(stranger, recorder);
        StompTestClient.subscribe(session, "/topic/chat." + channel, ChatMessageDto.class);

        assertNotNull(recorder.errors.poll(5, TimeUnit.SECONDS), "expected a STOMP ERROR frame");
    }

    @Test
    void sendingWithoutWritePermissionReturnsAnErrorToTheSenderOnly() throws Exception {
        UserEntity owner = newUser("owner");
        UserEntity reader = newUser("reader");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("ReadOnly"), "chat"));
        UUID readerRole = UUID.fromString(api(owner).post(Fixtures.workspaceUrl(ws) + "/roles",
            Fixtures.roleBody("Reader", "workspace.view", "chat.read")).<String>json("$.id"));
        workspaceMembers.save(new WorkspaceMemberEntity(ws, reader.getId(), readerRole));
        UUID channel = channelOf(owner, ws);

        StompSession session = connect(reader, new Recorder());
        @SuppressWarnings("rawtypes")
        BlockingQueue<Map> errors = StompTestClient.subscribe(session, "/user/queue/errors", Map.class);
        BlockingQueue<ChatMessageDto> inbox =
            StompTestClient.subscribe(session, "/topic/chat." + channel, ChatMessageDto.class);
        Thread.sleep(300);

        session.send("/app/chat." + channel + ".send", new SendChatMessageRequest("forbidden"));

        Map<?, ?> error = errors.poll(5, TimeUnit.SECONDS);
        assertNotNull(error, "expected an error on /user/queue/errors");
        assertEquals("FORBIDDEN", error.get("code"));
        assertNull(inbox.poll(500, TimeUnit.MILLISECONDS));
    }

    @Test
    void destinationsOutsideTheChatContractAreDenied() throws Exception {
        Recorder recorder = new Recorder();
        StompSession session = connect(newUser("owner"), recorder);

        session.send("/app/not-chat", new SendChatMessageRequest("x"));

        assertNotNull(recorder.errors.poll(5, TimeUnit.SECONDS), "expected a STOMP ERROR frame");
    }
}
