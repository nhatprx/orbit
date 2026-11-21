package com.orbit.chat.service;

import com.orbit.chat.dto.VoiceParticipantDto;
import com.orbit.chat.entity.ChatScopeType;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Storage abstraction for live voice room presence (Redis in multi-instance prod, in-memory fallback). */
public interface VoicePresenceStore {

    record ScopeKey(ChatScopeType scopeType, UUID scopeId) {}

    int participantCount(UUID channelId);

    List<VoiceParticipantDto> list(UUID channelId);

    VoiceParticipantDto get(UUID channelId, UUID userId);

    default boolean isParticipant(UUID channelId, UUID userId) {
        return get(channelId, userId) != null;
    }

    void put(UUID channelId, ScopeKey scope, VoiceParticipantDto participant);

    boolean refresh(UUID channelId, UUID userId);

    VoiceParticipantDto remove(UUID channelId, UUID userId);

    Map<UUID, VoiceParticipantDto> removeFromOtherRoomsInScope(UUID userId, UUID targetChannelId, ScopeKey scope);

    Set<UUID> findChannelsForUser(UUID userId);

    boolean clearChannel(UUID channelId);
}
