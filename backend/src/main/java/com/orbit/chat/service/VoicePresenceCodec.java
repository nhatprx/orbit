package com.orbit.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.VoiceParticipantDto;
import com.orbit.chat.service.VoicePresenceStore.ScopeKey;
import java.util.UUID;

/** Encodes and decodes Redis voice presence entries and builds canonical Redis keys. */
final class VoicePresenceCodec {

    static final String ROOM_PREFIX = "orbit:chat:voice:room:";
    static final String SCOPE_PREFIX = "orbit:chat:voice:scope:";
    static final String USER_PREFIX = "orbit:chat:voice:user:";

    record StoredEntry(VoiceParticipantDto participant, long expiresAtMs) {}

    private VoicePresenceCodec() {}

    static String roomKey(UUID channelId) {
        return ROOM_PREFIX + channelId;
    }

    static String scopeKey(ScopeKey scope) {
        return SCOPE_PREFIX + scope.scopeType().name() + ":" + scope.scopeId();
    }

    static String userKey(UUID userId) {
        return USER_PREFIX + userId;
    }

    static String encode(ObjectMapper mapper, VoiceParticipantDto participant, long expiresAtMs) {
        try {
            return mapper.writeValueAsString(new StoredEntry(participant, expiresAtMs));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize voice presence entry", ex);
        }
    }

    static StoredEntry decode(ObjectMapper mapper, Object raw) {
        if (raw == null) return null;
        try {
            return mapper.readValue(raw.toString(), StoredEntry.class);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    static UUID parseUuid(String raw) {
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
