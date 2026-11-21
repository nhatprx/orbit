package com.orbit.chat.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.dto.VoiceEventDto;
import com.orbit.chat.dto.VoiceParticipantDto;
import com.orbit.chat.dto.VoiceSignalRequest;
import com.orbit.chat.dto.VoiceStateRequest;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatChannelType;
import com.orbit.chat.service.VoicePresenceStore.ScopeKey;
import com.orbit.common.ApiException;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** Manages live voice room presence and WebRTC signaling over Redis/STOMP voice topics. */
@Service
public class ChatVoiceService {

    private final ChatAccessGuard guard;
    private final UserRepository users;
    private final ChatBroadcaster broadcaster;
    private final ChatRateLimiter rateLimiter;
    private final VoicePresenceStore presence;

    @Autowired
    public ChatVoiceService(
        ChatAccessGuard guard,
        UserRepository users,
        ChatBroadcaster broadcaster,
        ChatRateLimiter rateLimiter,
        VoicePresenceStore presence
    ) {
        this.guard = guard;
        this.users = users;
        this.broadcaster = broadcaster;
        this.rateLimiter = rateLimiter;
        this.presence = presence;
    }

    public int participantCount(UUID channelId) {
        return presence.participantCount(channelId);
    }

    public List<VoiceParticipantDto> listParticipants(UUID userId, UUID channelId) {
        requireVoiceChannel(userId, channelId, false);
        return presence.list(channelId);
    }

    public List<VoiceParticipantDto> join(UUID userId, UUID channelId, VoiceStateRequest request) {
        ChatChannelEntity channel = requireVoiceChannel(userId, channelId, true);
        UserEntity user = findUser(userId);
        ScopeKey scope = new ScopeKey(channel.getScopeType(), channel.getScopeId());
        Map<UUID, VoiceParticipantDto> leftRooms = presence.removeFromOtherRoomsInScope(userId, channelId, scope);
        for (Map.Entry<UUID, VoiceParticipantDto> entry : leftRooms.entrySet()) {
            VoiceParticipantDto removed = entry.getValue();
            broadcastParticipants(
                entry.getKey(), removed.userId(), removed.displayName(), removed.username(), presence.list(entry.getKey())
            );
        }

        VoiceStateRequest state = request == null
            ? new VoiceStateRequest(false, false, false, false, false)
            : request;
        VoiceParticipantDto existing = presence.get(channelId, userId);
        Instant joinedAt = existing != null ? existing.joinedAt() : Instant.now();
        presence.put(channelId, scope, toParticipant(userId, user.getUsername(), user.getDisplayName(), state, joinedAt));

        List<VoiceParticipantDto> participants = presence.list(channelId);
        broadcastParticipants(channelId, userId, user.getDisplayName(), user.getUsername(), participants);
        return participants;
    }

    public List<VoiceParticipantDto> updateState(UUID userId, UUID channelId, VoiceStateRequest request) {
        ChatChannelEntity channel = requireVoiceChannel(userId, channelId, true);
        if (request == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Voice state is required.");
        }
        VoiceParticipantDto current = presence.get(channelId, userId);
        if (current == null) {
            throw ApiException.badRequest("NOT_IN_VOICE", "Join the voice channel before updating state.");
        }
        ScopeKey scope = new ScopeKey(channel.getScopeType(), channel.getScopeId());
        presence.put(channelId, scope, toParticipant(
            current.userId(), current.username(), current.displayName(), request, current.joinedAt()
        ));

        List<VoiceParticipantDto> participants = presence.list(channelId);
        broadcastParticipants(channelId, current.userId(), current.displayName(), current.username(), participants);
        return participants;
    }

    public List<VoiceParticipantDto> leave(UUID userId, UUID channelId) {
        requireVoiceChannel(userId, channelId, false);
        VoiceParticipantDto removed = presence.remove(channelId, userId);
        List<VoiceParticipantDto> participants = presence.list(channelId);
        if (removed != null) {
            broadcastParticipants(channelId, removed.userId(), removed.displayName(), removed.username(), participants);
        }
        return participants;
    }

    public void relaySignal(UUID userId, UUID channelId, VoiceSignalRequest request) {
        requireVoiceChannel(userId, channelId, true);
        if (!presence.isParticipant(channelId, userId)) {
            throw ApiException.badRequest("NOT_IN_VOICE", "Join the voice channel before sending signals.");
        }
        rateLimiter.check(userId);
        String signalType = VoiceSignalValidator.validateSignal(request);
        presence.refresh(channelId, userId);
        UserEntity sender = findUser(userId);
        deliver(VoiceSignalValidator.signalEvent(
            channelId, userId, sender.getDisplayName(), sender.getUsername(), signalType, request
        ));
    }

    public void leaveChannelsOnDisconnect(UUID userId, Set<UUID> channelIds) {
        for (UUID channelId : channelIds) {
            VoiceParticipantDto removed = presence.remove(channelId, userId);
            if (removed != null) {
                broadcastParticipants(
                    channelId, removed.userId(), removed.displayName(), removed.username(), presence.list(channelId)
                );
            }
        }
    }

    public void leaveAllOnDisconnect(UUID userId, Set<UUID> trackedChannels) {
        Set<UUID> allChannels = new HashSet<>(trackedChannels);
        allChannels.addAll(presence.findChannelsForUser(userId));
        leaveChannelsOnDisconnect(userId, allChannels);
    }

    public void clearChannel(UUID channelId) {
        if (presence.clearChannel(channelId)) {
            broadcastParticipants(channelId, null, null, null, List.of());
        }
    }

    private ChatChannelEntity requireVoiceChannel(UUID userId, UUID channelId, boolean write) {
        ChatChannelEntity channel = guard.requireAccess(userId, channelId, write);
        if (channel.getChannelType() != ChatChannelType.VOICE) {
            throw ApiException.badRequest("NOT_VOICE_CHANNEL", "Voice operations require a voice channel.");
        }
        return channel;
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
        if (broadcaster != null) broadcaster.broadcastVoice(event);
    }
}
