package com.orbit.chat.dto;

public record VoiceStateRequest(
    boolean muted,
    boolean deafened,
    boolean cameraOn,
    boolean screenSharing,
    boolean speaking
) {}
