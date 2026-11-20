package com.orbit.auth.dto;

import java.time.Instant;

public record AuthSessionResponse(
    AuthUserDto user,
    String accessToken,
    Instant expiresAt,
    long expiresIn
) {}
