package com.orbit.chat.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record VoiceEventDto(
    String eventType,
    UUID channelId,
    UUID senderId,
    String senderName,
    String senderUsername,
    UUID targetUserId,
    String signalType,
    String sdp,
    String candidate,
    String sdpMid,
    Integer sdpMLineIndex,
    List<VoiceParticipantDto> participants,
    Instant timestamp
) {}
