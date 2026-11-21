package com.orbit.chat.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.dto.VoiceEventDto;
import com.orbit.chat.dto.VoiceParticipantDto;
import com.orbit.chat.dto.VoiceSignalRequest;
import com.orbit.chat.dto.VoiceStateRequest;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatChannelType;
import com.orbit.chat.entity.ChatScopeType;
import com.orbit.common.ApiException;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** Manages live voice room presence and WebRTC signaling over STOMP voice topics. */
@Service
public class ChatVoiceService {

    private record ScopeKey(ChatScopeType scopeType, UUID scopeId) {}

    private final ChatAccessGuard guard;
    private final UserRepository users;
    private final ChatRelay relay;
    private final ConcurrentHashMap<UUID, Map<UUID, VoiceParticipantDto>> rooms = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, ScopeKey> channelScopes = new ConcurrentHashMap<>();

    @Autowired
    public ChatVoiceService(ChatAccessGuard guard, UserRepository users, ObjectProvider<ChatRelay> relayProvider) {
        this(guard, users, relayProvider.getIfAvailable());
    }

    public ChatVoiceService(ChatAccessGuard guard, UserRepository users, ChatRelay relay) {
        this.guard = guard;
        this.users = users;
        this.relay = relay;
    }

    public int participantCount(UUID channelId) {
        Map<UUID, VoiceParticipantDto> room = rooms.get(channelId);
        return room == null ? 0 : room.size();
    }

    public List<VoiceParticipantDto> listParticipants(UUID userId, UUID channelId) {
        requireVoiceChannel(userId, channelId);
        return snapshot(channelId);
    }

    public List<VoiceParticipantDto> join(UUID userId, UUID channelId, VoiceStateRequest request) {
        ChatChannelEntity channel = requireVoiceChannel(userId, channelId);
        UserEntity user = findUser(userId);
        ScopeKey scope = new ScopeKey(channel.getScopeType(), channel.getScopeId());
        channelScopes.put(channelId, scope);
        leaveOtherRoomsInScope(userId, channelId, scope);

        VoiceStateRequest state = request == null
            ? new VoiceStateRequest(false, false, false, false, false)
            : request;
        Map<UUID, VoiceParticipantDto> room = rooms.computeIfAbsent(channelId, id -> new ConcurrentHashMap<>());
        VoiceParticipantDto existing = room.get(userId);
        Instant joinedAt = existing != null ? existing.joinedAt() : Instant.now();
        room.put(userId, toParticipant(userId, user.getUsername(), user.getDisplayName(), state, joinedAt));

        List<VoiceParticipantDto> participants = snapshot(channelId);
        broadcastParticipants(channelId, userId, user.getDisplayName(), user.getUsername(), participants);
        return participants;
    }

    public List<VoiceParticipantDto> updateState(UUID userId, UUID channelId, VoiceStateRequest request) {
        requireVoiceChannel(userId, channelId);
        if (request == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Voice state is required.");
        }
        Map<UUID, VoiceParticipantDto> room = rooms.get(channelId);
        VoiceParticipantDto current = room == null ? null : room.get(userId);
        if (current == null) {
            throw ApiException.badRequest("NOT_IN_VOICE", "Join the voice channel before updating state.");
        }
        room.put(userId, toParticipant(
            current.userId(), current.username(), current.displayName(), request, current.joinedAt()
        ));

        List<VoiceParticipantDto> participants = snapshot(channelId);
        broadcastParticipants(channelId, current.userId(), current.displayName(), current.username(), participants);
        return participants;
    }

    public List<VoiceParticipantDto> leave(UUID userId, UUID channelId) {
        requireVoiceChannel(userId, channelId);
        Map<UUID, VoiceParticipantDto> room = rooms.get(channelId);
        VoiceParticipantDto removed = room == null ? null : room.remove(userId);
        if (room != null && room.isEmpty()) {
            rooms.remove(channelId, room);
        }
        List<VoiceParticipantDto> participants = snapshot(channelId);
        if (removed != null) {
            broadcastParticipants(channelId, removed.userId(), removed.displayName(), removed.username(), participants);
        }
        return participants;
    }

    public void relaySignal(UUID userId, UUID channelId, VoiceSignalRequest request) {
        requireVoiceChannel(userId, channelId);
        String signalType = VoiceSignalValidator.validateSignal(request);
        UserEntity sender = findUser(userId);
        deliver(VoiceSignalValidator.signalEvent(
            channelId, userId, sender.getDisplayName(), sender.getUsername(), signalType, request
        ));
    }

    public void clearChannel(UUID channelId) {
        channelScopes.remove(channelId);
        Map<UUID, VoiceParticipantDto> removed = rooms.remove(channelId);
        if (removed != null && !removed.isEmpty()) {
            broadcastParticipants(channelId, null, null, null, List.of());
        }
    }

    private ChatChannelEntity requireVoiceChannel(UUID userId, UUID channelId) {
        ChatChannelEntity channel = guard.requireAccess(userId, channelId, false);
        if (channel.getChannelType() != ChatChannelType.VOICE) {
            throw ApiException.badRequest("NOT_VOICE_CHANNEL", "Voice operations require a voice channel.");
        }
        return channel;
    }

    private void leaveOtherRoomsInScope(UUID userId, UUID targetChannelId, ScopeKey scope) {
        for (Map.Entry<UUID, ScopeKey> entry : channelScopes.entrySet()) {
            UUID otherId = entry.getKey();
            if (otherId.equals(targetChannelId) || !scope.equals(entry.getValue())) continue;
            Map<UUID, VoiceParticipantDto> otherRoom = rooms.get(otherId);
            VoiceParticipantDto removed = otherRoom == null ? null : otherRoom.remove(userId);
            if (removed != null) {
                if (otherRoom.isEmpty()) rooms.remove(otherId, otherRoom);
                broadcastParticipants(otherId, removed.userId(), removed.displayName(), removed.username(), snapshot(otherId));
            }
        }
    }

    private static VoiceParticipantDto toParticipant(
        UUID userId, String username, String displayName, VoiceStateRequest state, Instant joinedAt
    ) {
        boolean deafened = state.deafened();
        return new VoiceParticipantDto(
            userId, username, displayName, deafened || state.muted(),
            deafened, state.cameraOn(), state.screenSharing(), state.speaking(), joinedAt
        );
    }

    private List<VoiceParticipantDto> snapshot(UUID channelId) {
        Map<UUID, VoiceParticipantDto> room = rooms.get(channelId);
        if (room == null || room.isEmpty()) return List.of();
        return room.values().stream()
            .sorted(Comparator.comparing(VoiceParticipantDto::joinedAt).thenComparing(VoiceParticipantDto::userId))
            .toList();
    }

    private UserEntity findUser(UUID userId) {
        return users.findById(userId)
            .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));
    }

    private void broadcastParticipants(
        UUID channelId, UUID actorId, String actorName, String actorUsername, List<VoiceParticipantDto> participants
    ) {
        deliver(VoiceSignalValidator.participantsEvent(channelId, actorId, actorName, actorUsername, participants));
    }

    private void deliver(VoiceEventDto event) {
        if (relay != null) relay.deliverVoice(event);
    }
}
