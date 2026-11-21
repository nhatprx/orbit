package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.chat.controller.ChatVoiceController;
import com.orbit.chat.dto.VoiceIceServerDto;
import com.orbit.chat.service.ChatVoiceService;
import com.orbit.chat.service.VoiceIceServerService;
import com.orbit.chat.websocket.VoiceSessionDisconnectListener;
import com.orbit.common.ApiException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

class VoiceDisconnectAndIceTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void disconnectListenerCleansUpVoiceOnlyWhenNoOtherSessionHoldsRoom() {
        ChatVoiceService voice = mock(ChatVoiceService.class);
        VoiceSessionDisconnectListener listener = new VoiceSessionDisconnectListener(voice);

        UUID userId = UUID.randomUUID();
        UUID voiceA = UUID.randomUUID();
        UUID voiceB = UUID.randomUUID();

        // Tab 1 subscribes to voiceA & voiceB; Tab 2 subscribes only to voiceA.
        listener.onConnected(new SessionConnectedEvent(this, stompMsg(StompCommand.CONNECTED, "s1", null, userId)));
        listener.onSubscribe(new SessionSubscribeEvent(this, stompMsg(StompCommand.SUBSCRIBE, "s1", "/topic/chat." + voiceA + ".voice", userId)));
        listener.onSubscribe(new SessionSubscribeEvent(this, stompMsg(StompCommand.SUBSCRIBE, "s1", "/topic/chat." + voiceB + ".voice", userId)));
        listener.onSubscribe(new SessionSubscribeEvent(this, stompMsg(StompCommand.SUBSCRIBE, "s1", "/topic/chat." + voiceA, userId)));
        listener.onSubscribe(new SessionSubscribeEvent(this, stompMsg(StompCommand.SUBSCRIBE, "s2", "/topic/chat." + voiceA + ".voice", userId)));

        // Disconnecting Tab 1 leaves only voiceB orphaned (Tab 2 still holds voiceA).
        listener.onDisconnect(disconnectEvent("s1", userId));
        verify(voice).leaveChannelsOnDisconnect(userId, Set.of(voiceB));
        verify(voice, never()).leaveAllOnDisconnect(any(), any());

        // Disconnecting Tab 2 leaves zero sessions -> cleans up all voice rooms for user.
        listener.onDisconnect(disconnectEvent("s2", userId));
        verify(voice).leaveAllOnDisconnect(userId, Set.of(voiceA));
    }

    @Test
    void iceServerParserHandlesDefaultCsvJsonTurnAndInvalidInputs() {
        VoiceIceServerService defaultSvc = new VoiceIceServerService(mapper, "");
        assertEquals(List.of(VoiceIceServerService.DEFAULT_STUN_URL), defaultSvc.getIceServers().getFirst().urls());
        assertNull(defaultSvc.getIceServers().getFirst().username());

        VoiceIceServerService csvSvc = new VoiceIceServerService(
            mapper, "stun:stun1.orbit.dev:19302, http://ignored.test, turn:turn.orbit.dev:3478"
        );
        assertEquals(2, csvSvc.getIceServers().size());
        assertEquals(List.of("stun:stun1.orbit.dev:19302"), csvSvc.getIceServers().get(0).urls());
        assertEquals(List.of("turn:turn.orbit.dev:3478"), csvSvc.getIceServers().get(1).urls());

        String json = """
            [
              "stun:stun.orbit.dev:19302",
              {"urls":["turn:turn1.orbit.dev:3478","turns:turn2.orbit.dev:5349"],"username":"orbit","credential":"secret"}
            ]
            """;
        VoiceIceServerService jsonSvc = new VoiceIceServerService(mapper, json);
        assertEquals(2, jsonSvc.getIceServers().size());
        VoiceIceServerDto turn = jsonSvc.getIceServers().get(1);
        assertEquals(List.of("turn:turn1.orbit.dev:3478", "turns:turn2.orbit.dev:5349"), turn.urls());
        assertEquals("orbit", turn.username());
        assertEquals("secret", turn.credential());

        VoiceIceServerService brokenJson = new VoiceIceServerService(mapper, "[not-valid-json");
        assertEquals(List.of(VoiceIceServerService.DEFAULT_STUN_URL), brokenJson.getIceServers().getFirst().urls());

        ChatVoiceController controller = new ChatVoiceController(mock(ChatVoiceService.class), jsonSvc);
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(UUID.randomUUID(), "jti", "user", "ws");
        assertEquals(2, controller.iceServers(principal).size());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class, () -> controller.iceServers(null)).getStatus());
    }

    private SessionDisconnectEvent disconnectEvent(String sessionId, UUID userId) {
        return new SessionDisconnectEvent(
            this, stompMsg(StompCommand.DISCONNECT, sessionId, null, userId), sessionId, CloseStatus.NORMAL
        );
    }

    private static Message<byte[]> stompMsg(StompCommand command, String sessionId, String destination, UUID userId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setSessionId(sessionId);
        if (destination != null) accessor.setDestination(destination);
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(userId, "jti", "user", "ws");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
            principal, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))
        ));
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
