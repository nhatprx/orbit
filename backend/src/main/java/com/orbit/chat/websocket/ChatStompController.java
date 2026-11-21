package com.orbit.chat.websocket;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.chat.dto.SendChatMessageRequest;
import com.orbit.chat.dto.VoiceSignalRequest;
import com.orbit.chat.service.ChatMessageService;
import com.orbit.chat.service.ChatVoiceService;
import com.orbit.common.ApiErrorResponse;
import com.orbit.common.ApiException;
import java.security.Principal;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

/** Handles /app/chat.{channelId}.send and /app/chat.{channelId}.signal STOMP frames. */
@Controller
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ChatStompController {

    private final ChatMessageService messages;
    private final ChatVoiceService voiceService;

    public ChatStompController(ChatMessageService messages, ChatVoiceService voiceService) {
        this.messages = messages;
        this.voiceService = voiceService;
    }

    @MessageMapping("chat.{channelId}.send")
    public void send(
        @DestinationVariable UUID channelId, @Payload SendChatMessageRequest payload, Principal principal
    ) {
        messages.send(requireUserId(principal), channelId, payload);
    }

    @MessageMapping("chat.{channelId}.signal")
    public void signal(
        @DestinationVariable UUID channelId, @Payload VoiceSignalRequest payload, Principal principal
    ) {
        voiceService.relaySignal(requireUserId(principal), channelId, payload);
    }

    @MessageExceptionHandler(ApiException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ApiErrorResponse onError(ApiException ex) {
        return ApiErrorResponse.of(ex.getCode(), ex.getMessage());
    }

    private static UUID requireUserId(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken token
            && token.getPrincipal() instanceof AuthenticatedUserPrincipal user) {
            return user.userId();
        }
        throw ApiException.forbidden("FORBIDDEN", "Authentication required.");
    }
}
