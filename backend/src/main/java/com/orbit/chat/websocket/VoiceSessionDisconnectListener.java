package com.orbit.chat.websocket;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.chat.service.ChatRelay;
import com.orbit.chat.service.ChatVoiceService;
import java.security.Principal;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

/** Tracks STOMP session voice memberships and cleans up voice presence on socket disconnect. */
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class VoiceSessionDisconnectListener {

    private final ChatVoiceService voiceService;
    private final ConcurrentHashMap<String, UUID> sessionUsers = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<UUID>> sessionChannels = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, Set<String>> userSessions = new ConcurrentHashMap<>();

    public VoiceSessionDisconnectListener(ChatVoiceService voiceService) {
        this.voiceService = voiceService;
    }

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        registerSession(accessor.getSessionId(), extractUserId(accessor.getUser()), null);
    }

    @EventListener
    public void onSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        UUID userId = extractUserId(accessor.getUser());
        UUID voiceChannelId = parseVoiceChannel(accessor.getDestination());
        registerSession(accessor.getSessionId(), userId, voiceChannelId);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = event.getSessionId() != null ? event.getSessionId() : accessor.getSessionId();
        if (sessionId == null) return;

        UUID userId = sessionUsers.remove(sessionId);
        if (userId == null) {
            userId = extractUserId(event.getUser() != null ? event.getUser() : accessor.getUser());
        }
        Set<UUID> trackedChannels = sessionChannels.remove(sessionId);
        if (userId == null) return;

        Set<String> remainingSessions = removeUserSession(userId, sessionId);
        if (remainingSessions.isEmpty()) {
            voiceService.leaveAllOnDisconnect(userId, trackedChannels == null ? Set.of() : trackedChannels);
            return;
        }
        if (trackedChannels == null || trackedChannels.isEmpty()) return;

        Set<UUID> orphanedChannels = new HashSet<>();
        for (UUID channelId : trackedChannels) {
            if (!hasOtherSessionForChannel(remainingSessions, channelId)) {
                orphanedChannels.add(channelId);
            }
        }
        if (!orphanedChannels.isEmpty()) {
            voiceService.leaveChannelsOnDisconnect(userId, orphanedChannels);
        }
    }

    private void registerSession(String sessionId, UUID userId, UUID voiceChannelId) {
        if (sessionId == null || userId == null) return;
        sessionUsers.put(sessionId, userId);
        userSessions.computeIfAbsent(userId, id -> ConcurrentHashMap.newKeySet()).add(sessionId);
        if (voiceChannelId != null) {
            sessionChannels.computeIfAbsent(sessionId, id -> ConcurrentHashMap.newKeySet()).add(voiceChannelId);
        }
    }

    private Set<String> removeUserSession(UUID userId, String sessionId) {
        Set<String> sessions = userSessions.get(userId);
        if (sessions == null) return Set.of();
        sessions.remove(sessionId);
        if (sessions.isEmpty()) {
            userSessions.remove(userId, sessions);
            return Set.of();
        }
        return Set.copyOf(sessions);
    }

    private boolean hasOtherSessionForChannel(Set<String> remainingSessions, UUID channelId) {
        for (String otherSessionId : remainingSessions) {
            Set<UUID> otherChannels = sessionChannels.get(otherSessionId);
            if (otherChannels != null && otherChannels.contains(channelId)) {
                return true;
            }
        }
        return false;
    }

    private static UUID parseVoiceChannel(String destination) {
        if (destination == null
            || !destination.startsWith(ChatRelay.TOPIC_PREFIX)
            || !destination.endsWith(ChatRelay.VOICE_SUFFIX)) {
            return null;
        }
        String rawId = destination.substring(
            ChatRelay.TOPIC_PREFIX.length(),
            destination.length() - ChatRelay.VOICE_SUFFIX.length()
        );
        try {
            return UUID.fromString(rawId);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static UUID extractUserId(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken token
            && token.getPrincipal() instanceof AuthenticatedUserPrincipal user) {
            return user.userId();
        }
        return null;
    }
}
