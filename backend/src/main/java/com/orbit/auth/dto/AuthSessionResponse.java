package com.orbit.auth.dto;

import java.time.Instant;

public record AuthSessionResponse(
    AuthUserDto user,
    String accessToken,
    Instant expiresAt,
    long expiresIn,
    boolean mfaRequired,
    String mfaToken
) {

    public AuthSessionResponse(
        AuthUserDto user,
        String accessToken,
        Instant expiresAt,
        long expiresIn
    ) {
        this(user, accessToken, expiresAt, expiresIn, false, null);
    }

    public static AuthSessionResponse mfaChallenge(String mfaToken) {
        return new AuthSessionResponse(null, null, null, 0L, true, mfaToken);
    }
}
