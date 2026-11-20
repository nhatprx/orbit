package com.orbit.auth.service;

import com.orbit.auth.entity.UserEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    public static final long DEFAULT_REMEMBER_ME_SECONDS = 2_592_000L;

    private final SecretKey signingKey;
    private final long expirationSeconds;
    private final long rememberMeExpirationSeconds;

    public record IssuedToken(String token, String jti, Instant expiresAt, long expiresInSeconds) {}

    public record VerifiedToken(UUID userId, String jti, String role, String workspaceId) {}

    public JwtService(String secret, long expirationSeconds) {
        this(secret, expirationSeconds, DEFAULT_REMEMBER_ME_SECONDS);
    }

    @Autowired
    public JwtService(
        @Value("${orbit.jwt.secret}") String secret,
        @Value("${orbit.jwt.expiration-seconds:3600}") long expirationSeconds,
        @Value("${orbit.jwt.remember-me-expiration-seconds:2592000}") long rememberMeExpirationSeconds
    ) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.expirationSeconds = expirationSeconds;
        this.rememberMeExpirationSeconds = rememberMeExpirationSeconds;
    }

    public IssuedToken issueToken(UserEntity user) {
        return issueToken(user, false);
    }

    public IssuedToken issueToken(UserEntity user, boolean rememberMe) {
        return issueToken(user, resolveExpirationSeconds(rememberMe));
    }

    public IssuedToken issueToken(UserEntity user, long ttlSeconds) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(ttlSeconds);
        String jti = UUID.randomUUID().toString();

        String token = Jwts.builder()
            .id(jti)
            .subject(user.getId().toString())
            .claim("username", user.getUsername())
            .claim("role", user.getRole())
            .claim("workspaceId", user.getWorkspaceId())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(signingKey)
            .compact();

        return new IssuedToken(token, jti, expiresAt, ttlSeconds);
    }

    public VerifiedToken verify(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(signingKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();

        return new VerifiedToken(
            UUID.fromString(claims.getSubject()),
            claims.getId(),
            claims.get("role", String.class),
            claims.get("workspaceId", String.class)
        );
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    public long getRememberMeExpirationSeconds() {
        return rememberMeExpirationSeconds;
    }

    public long resolveExpirationSeconds(boolean rememberMe) {
        return rememberMe ? rememberMeExpirationSeconds : expirationSeconds;
    }
}
