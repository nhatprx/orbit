package com.orbit.chat.dto;

import java.util.UUID;

public record VoiceSignalRequest(
    String type,
    UUID targetUserId,
    String sdp,
    String candidate,
    String sdpMid,
    Integer sdpMLineIndex
) {}
