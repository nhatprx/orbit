package com.orbit.cloud.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.cloud.config.OnlyOfficeProperties;
import com.orbit.cloud.dto.OnlyOfficeSessionResponse;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.common.ApiException;
import com.orbit.storage.config.S3Properties;
import com.orbit.storage.service.CloudDownloadSigner;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Builds signed ONLYOFFICE Document Editor session configurations for Cloud Files nodes. */
@Service
public class OnlyOfficeSessionService {

    private static final Duration FILE_TOKEN_TTL = Duration.ofHours(2);
    private static final Duration CALLBACK_TOKEN_TTL = Duration.ofHours(4);
    private static final Set<String> WORD_EXTS = Set.of("docx", "doc", "odt", "rtf", "txt", "pdf");
    private static final Set<String> CELL_EXTS = Set.of("xlsx", "xls", "ods", "csv");
    private static final Set<String> SLIDE_EXTS = Set.of("pptx", "ppt", "odp");

    private final OnlyOfficeProperties properties;
    private final OnlyOfficeTokenService tokenService;
    private final CloudNodeService nodeService;
    private final UserRepository userRepository;
    private final S3Properties s3Properties;
    private final CloudDownloadSigner downloadSigner;

    public OnlyOfficeSessionService(
        OnlyOfficeProperties properties,
        OnlyOfficeTokenService tokenService,
        CloudNodeService nodeService,
        UserRepository userRepository,
        S3Properties s3Properties,
        CloudDownloadSigner downloadSigner
    ) {
        this.properties = properties;
        this.tokenService = tokenService;
        this.nodeService = nodeService;
        this.userRepository = userRepository;
        this.s3Properties = s3Properties;
        this.downloadSigner = downloadSigner;
    }

    @Transactional(readOnly = true)
    public OnlyOfficeSessionResponse createSession(CloudScope scope, UUID userId, UUID nodeId, boolean canWrite) {
        CloudNodeEntity node = nodeService.requireActiveNode(scope, nodeId);
        if (node.getNodeType() != CloudNodeType.FILE || node.getStorageKey() == null) {
            throw ApiException.badRequest("NOT_A_FILE", "ONLYOFFICE editor only supports files.");
        }
        String mode = canWrite ? "edit" : "view";
        if (!properties.isEnabled()) {
            return new OnlyOfficeSessionResponse(false, properties.getPublicUrl(), Map.of(), null, mode);
        }

        String fileType = extractExtension(node.getName());
        String documentType = resolveDocumentType(fileType);
        String displayName = userRepository.findById(userId)
            .map(UserEntity::getDisplayName)
            .orElse("Orbit User");

        String callbackToken = tokenService.createAccessToken(
            "callback", nodeId, scope, userId, canWrite, CALLBACK_TOKEN_TTL
        );

        String callbackBase = properties.getCallbackBaseUrl();
        String fileUrl = resolveFileUrl(node, scope, userId, canWrite, callbackBase);
        String callbackUrl = callbackBase + "/api/v1/cloud/onlyoffice/callback?token=" + callbackToken;
        String docKey = buildDocumentKey(node);

        Map<String, Object> permissions = new LinkedHashMap<>();
        permissions.put("edit", canWrite);
        permissions.put("download", true);
        permissions.put("print", true);

        Map<String, Object> document = new LinkedHashMap<>();
        document.put("fileType", fileType);
        document.put("key", docKey);
        document.put("title", node.getName());
        document.put("url", fileUrl);
        document.put("permissions", permissions);

        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", userId.toString());
        user.put("name", displayName);

        Map<String, Object> editorConfig = new LinkedHashMap<>();
        editorConfig.put("mode", mode);
        editorConfig.put("callbackUrl", callbackUrl);
        editorConfig.put("user", user);

        Map<String, Object> config = new LinkedHashMap<>();
        config.put("document", document);
        config.put("documentType", documentType);
        config.put("editorConfig", editorConfig);

        String token = tokenService.signPayload(config);
        return new OnlyOfficeSessionResponse(true, properties.getPublicUrl(), config, token, mode);
    }

    private String resolveFileUrl(
        CloudNodeEntity node,
        CloudScope scope,
        UUID userId,
        boolean canWrite,
        String callbackBase
    ) {
        if (shouldUseDirectS3()) {
            return downloadSigner.signDownload(node.getStorageKey(), node.getName(), node.getMimeType()).url();
        }
        String fileToken = tokenService.createAccessToken(
            "file", node.getId(), scope, userId, canWrite, FILE_TOKEN_TTL
        );
        return callbackBase + "/api/v1/cloud/onlyoffice/file/" + node.getId() + "?token=" + fileToken;
    }

    private boolean shouldUseDirectS3() {
        String sourceMode = properties.getFileSourceMode();
        if ("s3".equals(sourceMode)) {
            return true;
        }
        if ("proxy".equals(sourceMode)) {
            return false;
        }
        String endpoint = s3Properties.getEndpoint();
        return endpoint == null || endpoint.isBlank();
    }

    static String buildDocumentKey(CloudNodeEntity node) {
        long millis = node.getUpdatedAt() != null ? node.getUpdatedAt().toEpochMilli() : 0L;
        return node.getId().toString().replace("-", "") + "_" + millis;
    }

    static String extractExtension(String name) {
        if (name == null) return "";
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) return "";
        return name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    static String resolveDocumentType(String ext) {
        if (WORD_EXTS.contains(ext)) return "word";
        if (CELL_EXTS.contains(ext)) return "cell";
        if (SLIDE_EXTS.contains(ext)) return "slide";
        throw ApiException.badRequest("UNSUPPORTED_FILE_TYPE", "File type '." + ext + "' is not supported by ONLYOFFICE.");
    }
}
