package com.orbit.collab.websocket;

import com.orbit.collab.service.CollabPresenceStore;
import com.orbit.collab.service.CollabRelay;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class CollabDisconnectListener {
    private final CollabPresenceStore presence;
    private final CollabRelay relay;

    public CollabDisconnectListener(CollabPresenceStore presence, CollabRelay relay) {
        this.presence = presence;
        this.relay = relay;
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor headers = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headers.getSessionId();
        if (sessionId != null) presence.disconnect(sessionId).forEach(relay::broadcast);
    }
}
