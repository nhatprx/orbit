package com.orbit.cloud.service;

import com.orbit.cloud.config.CloudProperties;
import com.orbit.cloud.config.OnlyOfficeProperties;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.service.OnlyOfficeTokenService.AccessTokenClaims;
import com.orbit.common.ApiException;
import com.orbit.storage.service.CloudStorageClient;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Handles authenticated ONLYOFFICE file streaming and save-callback persistence. */
@Service
public class OnlyOfficeCallbackService {

    private static final int STATUS_MUST_SAVE = 2;
    private static final int STATUS_MUST_FORCE_SAVE = 6;

    private final OnlyOfficeProperties properties;
    private final CloudProperties cloudProperties;
    private final OnlyOfficeTokenService tokenService;
    private final CloudNodeService nodeService;
    private final CloudDocumentService documentService;
    private final CloudStorageClient storageClient;
    private final OnlyOfficeFileFetcher fileFetcher;

    public record EditorFilePayload(byte[] bytes, String fileName, String mimeType) {}

    public OnlyOfficeCallbackService(
        OnlyOfficeProperties properties,
        CloudProperties cloudProperties,
        OnlyOfficeTokenService tokenService,
        CloudNodeService nodeService,
        CloudDocumentService documentService,
        CloudStorageClient storageClient,
        OnlyOfficeFileFetcher fileFetcher
    ) {
        this.properties = properties;
        this.cloudProperties = cloudProperties;
        this.tokenService = tokenService;
        this.nodeService = nodeService;
        this.documentService = documentService;
        this.storageClient = storageClient;
        this.fileFetcher = fileFetcher;
    }

    @Transactional(readOnly = true)
    public EditorFilePayload downloadFileForEditor(UUID nodeId, String token) {
        AccessTokenClaims claims = tokenService.verifyAccessToken(token, "file");
        if (!nodeId.equals(claims.nodeId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "TOKEN_NODE_MISMATCH", "File token does not match node.");
        }
        CloudNodeEntity node = nodeService.requireActiveNode(claims.toScope(), nodeId);
        if (node.getNodeType() != CloudNodeType.FILE || node.getStorageKey() == null) {
            throw ApiException.badRequest("NOT_A_FILE", "Target node must be a file.");
        }
        byte[] bytes = storageClient.getBytes(node.getStorageKey(), cloudProperties.getMaxFileSizeBytes());
        return new EditorFilePayload(bytes, node.getName(), node.getMimeType());
    }

    @Transactional
    public void handleCallback(String callbackToken, String authorizationHeader, Map<String, Object> body) {
        AccessTokenClaims claims = tokenService.verifyAccessToken(callbackToken, "callback");
        String onlyOfficeJwt = extractOnlyOfficeJwt(authorizationHeader, body);
        Map<String, Object> verified = tokenService.verifyPayload(onlyOfficeJwt);
        Map<String, Object> payload = unwrapPayload(verified);

        int status = readStatus(payload, body);
        String url = readString(payload.get("url"), body == null ? null : body.get("url"));
        if ((status != STATUS_MUST_SAVE && status != STATUS_MUST_FORCE_SAVE) || url == null || url.isBlank()) {
            return;
        }
        if (!claims.canWrite()) {
            throw ApiException.forbidden("READ_ONLY_SESSION", "Write permission is required to save edits.");
        }
        String downloadUrl = rewriteDownloadUrl(url);
        byte[] editedBytes = fileFetcher.fetch(downloadUrl, cloudProperties.getMaxFileSizeBytes());
        documentService.replaceNodeBytes(claims.toScope(), claims.nodeId(), claims.userId(), editedBytes);
    }

    String rewriteDownloadUrl(String url) {
        String pub = properties.getPublicUrl();
        String internal = properties.getInternalUrl();
        if (!pub.isBlank() && !internal.isBlank() && url.startsWith(pub)) {
            return internal + url.substring(pub.length());
        }
        return url;
    }

    private static String extractOnlyOfficeJwt(String authorizationHeader, Map<String, Object> body) {
        if (authorizationHeader != null && authorizationHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            String bearer = authorizationHeader.substring(7).trim();
            if (!bearer.isBlank()) return bearer;
        }
        if (body != null && body.get("token") instanceof String token && !token.isBlank()) {
            return token.trim();
        }
        throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_ONLYOFFICE_TOKEN", "Missing ONLYOFFICE callback JWT.");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> unwrapPayload(Map<String, Object> verified) {
        Object nested = verified.get("payload");
        if (nested instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return verified;
    }

    private static int readStatus(Map<String, Object> payload, Map<String, Object> body) {
        Object raw = payload.get("status");
        if (raw == null && body != null) raw = body.get("status");
        if (raw instanceof Number num) return num.intValue();
        return -1;
    }

    private static String readString(Object primary, Object fallback) {
        if (primary instanceof String s && !s.isBlank()) return s;
        if (fallback instanceof String s && !s.isBlank()) return s;
        return null;
    }
}
