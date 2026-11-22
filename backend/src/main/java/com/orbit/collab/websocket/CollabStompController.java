package com.orbit.collab.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.auth.repository.UserRepository;
import com.orbit.collab.dto.CollabEditRequest;
import com.orbit.collab.dto.CollabPresenceRequest;
import com.orbit.collab.dto.CollabRoomEvent;
import com.orbit.collab.service.CollabPresenceStore;
import com.orbit.collab.service.CollabRelay;
import java.security.Principal;
import java.time.Instant;
import java.util.UUID;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;

@Controller
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class CollabStompController {
    private final CollabRelay relay;
    private final CollabPresenceStore presence;
    private final UserRepository users;
    private final ObjectMapper mapper;
    private final AtomicLong sequence = new AtomicLong();

    public CollabStompController(
        CollabRelay relay, CollabPresenceStore presence, UserRepository users, ObjectMapper mapper
    ) {
        this.relay = relay;
        this.presence = presence;
        this.users = users;
        this.mapper = mapper;
    }

    @MessageMapping("/collab.{kind}.{resourceId}.presence")
    public void presence(
        @DestinationVariable String kind, @DestinationVariable UUID resourceId,
        @Payload CollabPresenceRequest request, Principal principal, @Header("simpSessionId") String sessionId
    ) {
        String normalized = normalizeKind(kind);
        AuthenticatedUserPrincipal actor = actor(principal);
        String name = users.findById(actor.userId()).map(user -> user.getDisplayName()).orElse("Collaborator");
        String action = request == null || request.action() == null ? "" : request.action().toUpperCase(Locale.ROOT);
        var participants = switch (action) {
            case "JOIN", "CURSOR" -> presence.update(
                normalized, resourceId, actor.userId(), sessionId, name, request.cursor()
            );
            case "LEAVE" -> presence.remove(normalized, resourceId, sessionId);
            default -> throw new IllegalArgumentException("Unsupported presence action.");
        };
        ObjectNode payload = mapper.createObjectNode();
        if (request != null && request.cursor() != null) payload.set("cursor", request.cursor());
        relay.broadcast(new CollabRoomEvent(
            "CURSOR_UPDATE".equals(action) ? "CURSOR_UPDATE" : "PRESENCE_SYNC",
            resourceKind(normalized), resourceId, actor.userId(), sessionId, name,
            sequence.incrementAndGet(), Instant.now(), participants, payload
        ));
    }

    @MessageMapping("/collab.{kind}.{resourceId}.edit")
    public void edit(
        @DestinationVariable String kind, @DestinationVariable UUID resourceId,
        @Payload CollabEditRequest request, Principal principal, SimpMessageHeaderAccessor headers
    ) {
        String normalized = normalizeKind(kind);
        if (request == null || request.subType() == null || request.subType().isBlank()
            || request.payload() == null || !request.payload().isObject()) {
            throw new IllegalArgumentException("Collaboration edit payload is malformed.");
        }
        AuthenticatedUserPrincipal actor = actor(principal);
        String sessionId = headers.getSessionId();
        String name = users.findById(actor.userId()).map(user -> user.getDisplayName()).orElse("Collaborator");
        ObjectNode payload = mapper.createObjectNode();
        payload.put("subType", request.subType());
        if (request.payload() != null && request.payload().isObject()) payload.set("payload", request.payload());
        relay.broadcast(new CollabRoomEvent(
            "CONTENT_DELTA", resourceKind(normalized), resourceId, actor.userId(), sessionId, name,
            sequence.incrementAndGet(), Instant.now(), null, payload
        ));
    }

    private static String normalizeKind(String kind) {
        if ("whiteboard".equals(kind) || "cloud".equals(kind)) return kind;
        throw new IllegalArgumentException("Unsupported collaboration room.");
    }

    private static String resourceKind(String kind) {
        return "whiteboard".equals(kind) ? "WHITEBOARD" : "CLOUD_NODE";
    }

    private static AuthenticatedUserPrincipal actor(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
            && auth.getPrincipal() instanceof AuthenticatedUserPrincipal user) return user;
        throw new IllegalStateException("Authenticated collaboration session required.");
    }
}
