package com.orbit.chat.service;

import com.orbit.chat.dto.ChatPresenceEvent;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.common.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ChatPresenceService {
    private final ChatAccessGuard guard;
    private final ChatPresenceStore presence;
    private final ChatBroadcaster broadcaster;

    public ChatPresenceService(ChatAccessGuard guard, ChatPresenceStore presence, ChatBroadcaster broadcaster) {
        this.guard = guard;
        this.presence = presence;
        this.broadcaster = broadcaster;
    }

    public void update(UUID userId, UUID channelId, String sessionId, String action) {
        if (!"JOIN".equals(action) && !"HEARTBEAT".equals(action) && !"LEAVE".equals(action)) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Unsupported presence action.");
        }
        ChatChannelEntity channel = guard.requireAccess(userId, channelId, false);
        String type = channel.getScopeType().name();
        UUID scopeId = channel.getScopeId();
        if ("HEARTBEAT".equals(action)) {
            presence.heartbeat(type, scopeId, userId, sessionId);
            return;
        }
        int count = "JOIN".equals(action)
            ? presence.touch(type, scopeId, userId, sessionId)
            : presence.leave(type, scopeId, sessionId);
        broadcaster.broadcastPresence(ChatPresenceEvent.of(type, scopeId, count));
    }

    public void disconnect(String sessionId) {
        List<ChatPresenceEvent> events = presence.disconnect(sessionId);
        events.forEach(broadcaster::broadcastPresence);
    }
}
