package com.orbit.chat.websocket;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.chat.dto.SendChatMessageRequest;
import com.orbit.chat.service.ChatMessageService;
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

/** Handles /app/chat.{channelId}.send; permission and rate rules live in {@link ChatMessageService}. */
@Controller
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ChatStompController {

    private final ChatMessageService messages;

    public ChatStompController(ChatMessageService messages) {
        this.messages = messages;
    }

    @MessageMapping("chat.{channelId}.send")
    public void send(
        @DestinationVariable UUID channelId, @Payload SendChatMessageRequest payload, Principal principal
    ) {
        if (principal instanceof UsernamePasswordAuthenticationToken token
            && token.getPrincipal() instanceof AuthenticatedUserPrincipal user) {
            messages.send(user.userId(), channelId, payload.content());
            return;
        }
        throw ApiException.forbidden("FORBIDDEN", "Authentication required.");
    }

    @MessageExceptionHandler(ApiException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ApiErrorResponse onError(ApiException ex) {
        return ApiErrorResponse.of(ex.getCode(), ex.getMessage());
    }
}
