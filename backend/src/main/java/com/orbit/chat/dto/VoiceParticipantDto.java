package com.orbit.chat.dto;

import java.time.Instant;
import java.util.UUID;

public record VoiceParticipantDto(
    UUID userId,
    String username,
    String displayName,
    String avatarUrl,
    boolean muted,
    boolean deafened,
    boolean cameraOn,
    boolean screenSharing,
    boolean speaking,
    Instant joinedAt
) {
    public VoiceParticipantDto(
        UUID userId, String username, String displayName,
        boolean muted, boolean deafened, boolean cameraOn, boolean screenSharing, boolean speaking, Instant joinedAt
    ) {
        this(userId, username, displayName, null, muted, deafened, cameraOn, screenSharing, speaking, joinedAt);
    }
}
