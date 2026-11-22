package com.orbit.chat.websocket;

import com.orbit.chat.service.ChatPresenceService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ChatPresenceDisconnectListener {
    private final ChatPresenceService presence;

    public ChatPresenceDisconnectListener(ChatPresenceService presence) { this.presence = presence; }

    @EventListener
    public void disconnected(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = event.getSessionId() != null ? event.getSessionId() : accessor.getSessionId();
        if (sessionId != null) presence.disconnect(sessionId);
    }
}
