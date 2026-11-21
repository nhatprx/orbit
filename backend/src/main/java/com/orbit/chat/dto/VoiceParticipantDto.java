package com.orbit.chat.dto;

import java.time.Instant;
import java.util.UUID;

public record VoiceParticipantDto(
    UUID userId,
    String username,
    String displayName,
    boolean muted,
    boolean deafened,
    boolean cameraOn,
    boolean screenSharing,
    boolean speaking,
    Instant joinedAt
) {}
