package com.orbit.chat.websocket;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.auth.service.JwtService;
import com.orbit.auth.service.JwtService.VerifiedToken;
import com.orbit.auth.service.RedisSessionService;
import com.orbit.chat.service.ChatRelay;
import com.orbit.chat.service.ChatAccessGuard;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

/**
 * CONNECT authenticates the JWT carried in the STOMP frame (never in the URL), SUBSCRIBE enforces
 * chat.read / pchat.read per channel, and everything outside the chat destinations is denied.
 */
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    static final String ERROR_QUEUE = "/user/queue/errors";
    static final String SEND_PREFIX = "/app/chat.";

    private final JwtService jwtService;
    private final RedisSessionService sessions;
    private final ChatAccessGuard guard;

    public StompAuthChannelInterceptor(JwtService jwtService, RedisSessionService sessions, ChatAccessGuard guard) {
        this.jwtService = jwtService;
        this.sessions = sessions;
        this.guard = guard;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        StompCommand command = accessor == null ? null : accessor.getCommand();
        if (command == StompCommand.CONNECT || command == StompCommand.STOMP) {
            accessor.setUser(authenticate(accessor.getFirstNativeHeader("Authorization")));
        } else if (command == StompCommand.SUBSCRIBE) {
            authorizeSubscribe(accessor);
        } else if (command == StompCommand.SEND) {
            requireUser(accessor);
            String destination = accessor.getDestination();
            if (destination == null || !destination.startsWith(SEND_PREFIX)) {
                throw new MessagingException("Destination is not allowed.");
            }
        }
        return message;
    }

    private Principal authenticate(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessagingException("Authentication required.");
        }
        try {
            VerifiedToken token = jwtService.verify(header.substring(7).trim());
            if (!sessions.isSessionActive(token.jti())) {
                throw new MessagingException("Session expired.");
            }
            AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(
                token.userId(), token.jti(), token.role(), token.workspaceId()
            );
            return new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + token.role().toUpperCase()))
            );
        } catch (MessagingException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new MessagingException("Invalid token.");
        }
    }

    private void authorizeSubscribe(StompHeaderAccessor accessor) {
        UUID userId = requireUser(accessor);
        String destination = accessor.getDestination();
        if (ERROR_QUEUE.equals(destination)) {
            return;
        }
        if (destination == null || !destination.startsWith(ChatRelay.TOPIC_PREFIX)) {
            throw new MessagingException("Destination is not allowed.");
        }
        UUID channelId;
        try {
            String rawId = destination.substring(ChatRelay.TOPIC_PREFIX.length());
            if (rawId.endsWith(ChatRelay.VOICE_SUFFIX)) {
                rawId = rawId.substring(0, rawId.length() - ChatRelay.VOICE_SUFFIX.length());
            }
            channelId = UUID.fromString(rawId);
        } catch (IllegalArgumentException ex) {
            throw new MessagingException("Destination is not allowed.");
        }
        if (!guard.canRead(userId, channelId)) {
            throw new MessagingException("You cannot read this channel.");
        }
    }

    private UUID requireUser(StompHeaderAccessor accessor) {
        Principal user = accessor.getUser();
        if (user instanceof UsernamePasswordAuthenticationToken token
            && token.getPrincipal() instanceof AuthenticatedUserPrincipal principal) {
            return principal.userId();
        }
        throw new MessagingException("Authentication required.");
    }
}
