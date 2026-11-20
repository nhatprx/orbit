package com.orbit.cloud.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.cloud.config.OnlyOfficeProperties;
import com.orbit.cloud.entity.CloudScopeType;
import com.orbit.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** HS256 JWT signing and verification for ONLYOFFICE Document Server and callback tokens. */
@Service
public class OnlyOfficeTokenService {

    private static final String HMAC_ALG = "HmacSHA256";
    private static final String HEADER_JSON = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
    private static final Base64.Encoder B64_ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64_DEC = Base64.getUrlDecoder();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final OnlyOfficeProperties properties;
    private final ObjectMapper objectMapper;

    public record AccessTokenClaims(
        UUID nodeId,
        CloudScopeType scopeType,
        UUID scopeId,
        UUID workspaceId,
        UUID projectId,
        UUID userId,
        boolean canWrite
    ) {
        public CloudScope toScope() {
            return new CloudScope(scopeType, scopeId, workspaceId, projectId);
        }
    }

    public OnlyOfficeTokenService(OnlyOfficeProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public String signPayload(Map<String, Object> payload) {
        try {
            String headerB64 = B64_ENC.encodeToString(HEADER_JSON.getBytes(StandardCharsets.UTF_8));
            String payloadB64 = B64_ENC.encodeToString(objectMapper.writeValueAsBytes(payload));
            String signingInput = headerB64 + "." + payloadB64;
            String sigB64 = B64_ENC.encodeToString(hmacSha256(signingInput));
            return signingInput + "." + sigB64;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to sign ONLYOFFICE JWT", ex);
        }
    }

    public Map<String, Object> verifyPayload(String token) {
        if (token == null || token.isBlank()) {
            throw unauthorized("Missing ONLYOFFICE JWT.");
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw unauthorized("Malformed ONLYOFFICE JWT.");
        }
        try {
            Map<String, Object> header = objectMapper.readValue(B64_DEC.decode(parts[0]), MAP_TYPE);
            if (!"HS256".equals(header.get("alg"))) {
                throw unauthorized("Unsupported JWT algorithm.");
            }
            byte[] expectedSig = hmacSha256(parts[0] + "." + parts[1]);
            byte[] actualSig = B64_DEC.decode(parts[2]);
            if (!MessageDigest.isEqual(expectedSig, actualSig)) {
                throw unauthorized("Invalid ONLYOFFICE JWT signature.");
            }
            Map<String, Object> claims = objectMapper.readValue(B64_DEC.decode(parts[1]), MAP_TYPE);
            Object expObj = claims.get("exp");
            if (expObj instanceof Number expNum) {
                if (Instant.now().getEpochSecond() >= expNum.longValue()) {
                    throw unauthorized("ONLYOFFICE JWT has expired.");
                }
            }
            return claims;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw unauthorized("Invalid ONLYOFFICE JWT.");
        }
    }

    public String createAccessToken(
        String purpose, UUID nodeId, CloudScope scope, UUID userId, boolean canWrite, Duration ttl
    ) {
        Instant now = Instant.now();
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("purpose", purpose);
        claims.put("nodeId", nodeId.toString());
        claims.put("scopeType", scope.type().name());
        claims.put("scopeId", scope.scopeId().toString());
        if (scope.workspaceId() != null) claims.put("workspaceId", scope.workspaceId().toString());
        if (scope.projectId() != null) claims.put("projectId", scope.projectId().toString());
        claims.put("userId", userId.toString());
        claims.put("canWrite", canWrite);
        claims.put("iat", now.getEpochSecond());
        claims.put("exp", now.plus(ttl).getEpochSecond());
        return signPayload(claims);
    }

    public AccessTokenClaims verifyAccessToken(String token, String expectedPurpose) {
        Map<String, Object> claims = verifyPayload(token);
        if (!expectedPurpose.equals(claims.get("purpose"))) {
            throw unauthorized("Invalid token purpose.");
        }
        try {
            UUID nodeId = UUID.fromString(String.valueOf(claims.get("nodeId")));
            CloudScopeType scopeType = CloudScopeType.valueOf(String.valueOf(claims.get("scopeType")));
            UUID scopeId = UUID.fromString(String.valueOf(claims.get("scopeId")));
            UUID workspaceId = parseOptionalUuid(claims.get("workspaceId"));
            UUID projectId = parseOptionalUuid(claims.get("projectId"));
            UUID userId = UUID.fromString(String.valueOf(claims.get("userId")));
            boolean canWrite = Boolean.TRUE.equals(claims.get("canWrite"));
            return new AccessTokenClaims(nodeId, scopeType, scopeId, workspaceId, projectId, userId, canWrite);
        } catch (RuntimeException ex) {
            throw unauthorized("Malformed token claims.");
        }
    }

    private byte[] hmacSha256(String data) throws GeneralSecurityException {
        String secret = properties.getJwtSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("ONLYOFFICE JWT secret is not configured.");
        }
        Mac mac = Mac.getInstance(HMAC_ALG);
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALG));
        return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
    }

    private static UUID parseOptionalUuid(Object value) {
        return value == null ? null : UUID.fromString(String.valueOf(value));
    }

    private static ApiException unauthorized(String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_ONLYOFFICE_TOKEN", message);
    }
}
