package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.auth.service.JwtService;
import com.orbit.auth.service.RedisSessionService;
import com.orbit.chat.dto.ChatMessageDeletedDto;
import com.orbit.chat.dto.SendChatMessageRequest;
import com.orbit.chat.dto.VoiceEventDto;
import com.orbit.chat.dto.VoiceSignalRequest;
import com.orbit.chat.service.ChatAccessGuard;
import com.orbit.chat.service.ChatMessageService;
import com.orbit.chat.service.ChatRelay;
import com.orbit.chat.service.ChatVoiceService;
import com.orbit.chat.websocket.ChatStompController;
import com.orbit.chat.websocket.StompAuthChannelInterceptor;
import com.orbit.common.ApiException;
import java.lang.reflect.Constructor;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class ChatStompVoiceAuthTest {

    @Test
    void subscribeAllowsAndEnforcesReadAccessOnChatAndVoiceTopics() {
        ChatAccessGuard guard = mock(ChatAccessGuard.class);
        StompAuthChannelInterceptor interceptor = new StompAuthChannelInterceptor(
            mock(JwtService.class), mock(RedisSessionService.class), guard
        );
        UUID userId = UUID.randomUUID();
        UUID allowedChannel = UUID.randomUUID();
        UUID deniedChannel = UUID.randomUUID();
        when(guard.canRead(userId, allowedChannel)).thenReturn(true);
        when(guard.canRead(userId, deniedChannel)).thenReturn(false);

        MessageChannel ch = mock(MessageChannel.class);
        assertDoesNotThrow(() -> interceptor.preSend(stompFrame(StompCommand.SUBSCRIBE, "/topic/chat." + allowedChannel, userId), ch));
        assertDoesNotThrow(() -> interceptor.preSend(stompFrame(StompCommand.SUBSCRIBE, "/topic/chat." + allowedChannel + ".voice", userId), ch));
        assertThrows(MessagingException.class, () ->
            interceptor.preSend(stompFrame(StompCommand.SUBSCRIBE, "/topic/chat." + deniedChannel + ".voice", userId), ch)
        );
        assertThrows(MessagingException.class, () ->
            interceptor.preSend(stompFrame(StompCommand.SUBSCRIBE, "/topic/chat.not-a-uuid.voice", userId), ch)
        );
        assertThrows(MessagingException.class, () ->
            interceptor.preSend(stompFrame(StompCommand.SUBSCRIBE, "/topic/chat." + allowedChannel + ".other", userId), ch)
        );

        assertDoesNotThrow(() -> interceptor.preSend(stompFrame(StompCommand.SEND, "/app/chat." + allowedChannel + ".signal", userId), ch));
        assertThrows(MessagingException.class, () ->
            interceptor.preSend(stompFrame(StompCommand.SEND, "/app/other.signal", userId), ch)
        );
    }

    @Test
    void stompControllerForwardsFullSendRequestAndVoiceSignals() {
        ChatMessageService messageService = mock(ChatMessageService.class);
        ChatVoiceService voiceService = mock(ChatVoiceService.class);
        ChatStompController controller = new ChatStompController(messageService, voiceService);
        UUID userId = UUID.randomUUID();
        UUID channelId = UUID.randomUUID();
        UsernamePasswordAuthenticationToken auth = authFor(userId);

        SendChatMessageRequest sendReq = new SendChatMessageRequest("hi", UUID.randomUUID(), "doc", "https://orbit.test/doc");
        controller.send(channelId, sendReq, auth);
        verify(messageService).send(userId, channelId, sendReq);

        VoiceSignalRequest signalReq = new VoiceSignalRequest("OFFER", UUID.randomUUID(), "sdp", null, null, null);
        controller.signal(channelId, signalReq, auth);
        verify(voiceService).relaySignal(userId, channelId, signalReq);

        assertThrows(ApiException.class, () -> controller.signal(channelId, signalReq, null));
    }

    @Test
    void relayDeliversVoiceEventsToVoiceTopicSuffix() throws Exception {
        SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);
        Constructor<ChatRelay> ctor = ChatRelay.class.getDeclaredConstructor(SimpMessagingTemplate.class);
        ctor.setAccessible(true);
        ChatRelay relay = ctor.newInstance(template);
        UUID channelId = UUID.randomUUID();
        VoiceEventDto event = new VoiceEventDto(
            "PARTICIPANTS", channelId, null, null, null, null, null, null, null, null, null, List.of(), Instant.now()
        );

        relay.deliverVoice(event);
        verify(template).convertAndSend("/topic/chat." + channelId + ".voice", event);

        ChatMessageDeletedDto deleted = ChatMessageDeletedDto.of(channelId, UUID.randomUUID());
        relay.deliverDeletion(deleted);
        verify(template).convertAndSend("/topic/chat." + channelId, deleted);
    }

    private static Message<byte[]> stompFrame(StompCommand command, String destination, UUID userId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        accessor.setUser(authFor(userId));
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static UsernamePasswordAuthenticationToken authFor(UUID userId) {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(userId, "jti", "user", "ws");
        return new UsernamePasswordAuthenticationToken(
            principal, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }
}
