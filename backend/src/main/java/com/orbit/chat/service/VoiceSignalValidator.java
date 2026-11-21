package com.orbit.chat.service;

import com.orbit.chat.dto.VoiceEventDto;
import com.orbit.chat.dto.VoiceParticipantDto;
import com.orbit.chat.dto.VoiceSignalRequest;
import com.orbit.common.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Validates WebRTC signal payloads and builds voice STOMP events. */
final class VoiceSignalValidator {

    private static final int MAX_SDP_LENGTH = 65_536;
    private static final int MAX_CANDIDATE_LENGTH = 4_096;
    private static final Set<String> SIGNAL_TYPES = Set.of(
        "OFFER", "ANSWER", "ICE_CANDIDATE",
        "SCREEN_SHARE_STARTED", "SCREEN_SHARE_STOPPED", "SPEAKING"
    );

    private VoiceSignalValidator() {}

    static String validateSignal(VoiceSignalRequest request) {
        if (request == null || request.type() == null || request.type().isBlank()) {
            throw ApiException.badRequest("INVALID_SIGNAL", "Voice signal type is required.");
        }
        String signalType = request.type().trim().toUpperCase(Locale.ROOT);
        if (!SIGNAL_TYPES.contains(signalType)) {
            throw ApiException.badRequest("INVALID_SIGNAL", "Unsupported voice signal type.");
        }
        if (request.sdp() != null && request.sdp().length() > MAX_SDP_LENGTH) {
            throw ApiException.badRequest("VALIDATION_ERROR", "SDP payload exceeds limit.");
        }
        if (request.candidate() != null && request.candidate().length() > MAX_CANDIDATE_LENGTH) {
            throw ApiException.badRequest("VALIDATION_ERROR", "ICE candidate payload exceeds limit.");
        }
        return signalType;
    }

    static VoiceEventDto participantsEvent(
        UUID channelId, UUID actorId, String actorName, String actorUsername, List<VoiceParticipantDto> participants
    ) {
        return new VoiceEventDto(
            "PARTICIPANTS", channelId, actorId, actorName, actorUsername,
            null, null, null, null, null, null, participants, Instant.now()
        );
    }

    static VoiceEventDto signalEvent(
        UUID channelId, UUID senderId, String senderName, String senderUsername,
        String signalType, VoiceSignalRequest request
    ) {
        return new VoiceEventDto(
            "SIGNAL", channelId, senderId, senderName, senderUsername,
            request.targetUserId(), signalType, request.sdp(), request.candidate(),
            request.sdpMid(), request.sdpMLineIndex(), null, Instant.now()
        );
    }
}
