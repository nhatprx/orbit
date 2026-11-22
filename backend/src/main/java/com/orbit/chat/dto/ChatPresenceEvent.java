package com.orbit.chat.dto;

import java.util.UUID;

/** Online count for people with an active chat session in one workspace or project. */
public record ChatPresenceEvent(String eventType, String scopeType, UUID scopeId, int onlineCount) {
    public static ChatPresenceEvent of(String scopeType, UUID scopeId, int count) {
        return new ChatPresenceEvent("PRESENCE", scopeType, scopeId, count);
    }
}
