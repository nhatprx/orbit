package com.orbit.chat.service;

import com.orbit.chat.dto.ChatImagePresignRequest;
import com.orbit.chat.dto.ChatImagePresignResponse;
import com.orbit.common.ApiException;
import com.orbit.storage.dto.PresignedUrlResponse;
import com.orbit.storage.service.S3KeyValidator;
import com.orbit.storage.service.StorageService;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Creates presigned S3 upload URLs for chat images/files and resolves stored keys on read. */
@Service
public class ChatImageService {

    public static final long MAX_IMAGE_BYTES = 10L * 1024L * 1024L;
    public static final long MAX_FILE_BYTES = 25L * 1024L * 1024L;
    public static final String ATTACHMENT_PREFIX = "/api/v1/chat/images?key=";
    public static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    public static final Set<String> ALLOWED_FILE_TYPES = Set.of(
        "application/pdf",
        "text/plain",
        "text/csv",
        "text/markdown",
        "application/json",
        "application/zip",
        "application/x-zip-compressed",
        "application/gzip",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "video/mp4",
        "video/webm",
        "audio/mpeg",
        "audio/wav",
        "application/octet-stream"
    );

    private final ChatAccessGuard guard;
    private final StorageService storageService;

    public ChatImageService(ChatAccessGuard guard, StorageService storageService) {
        this.guard = guard;
        this.storageService = storageService;
    }

    public ChatImagePresignResponse createUploadUrl(UUID userId, UUID channelId, ChatImagePresignRequest request) {
        guard.requireAccess(userId, channelId, true);
        if (request == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "File metadata is required.");
        }
        String contentType = validateContentType(request.contentType());
        boolean isImage = ALLOWED_IMAGE_TYPES.contains(contentType);
        validateFileSize(request.fileSize(), isImage);
        String sanitized = S3KeyValidator.sanitizeFilename(request.filename());
        String objectKey = "uploads/chat/" + channelId + "/" + UUID.randomUUID() + "-" + sanitized;
        PresignedUrlResponse presigned = storageService.createPresignedUploadUrlForKey(objectKey, contentType);
        return new ChatImagePresignResponse(
            presigned.key(),
            presigned.url(),
            ATTACHMENT_PREFIX + presigned.key(),
            presigned.method(),
            contentType,
            presigned.expiresAt()
        );
    }

    public static String resolveAttachmentUrl(StorageService storage, String rawUrl) {
        if (rawUrl == null || !rawUrl.startsWith(ATTACHMENT_PREFIX) || storage == null) {
            return rawUrl;
        }
        String key = rawUrl.substring(ATTACHMENT_PREFIX.length()).trim();
        if (key.isEmpty()) return rawUrl;
        try {
            String resolved = storage.resolveObjectUrl(key);
            return resolved != null ? resolved : rawUrl;
        } catch (RuntimeException ex) {
            return rawUrl;
        }
    }

    private static String validateContentType(String raw) {
        if (raw == null || raw.isBlank()) {
            throw invalidType();
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_IMAGE_TYPES.contains(normalized) && !ALLOWED_FILE_TYPES.contains(normalized)) {
            throw invalidType();
        }
        return normalized;
    }

    private static void validateFileSize(Long size, boolean isImage) {
        long limit = isImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
        if (size == null || size <= 0 || size > limit) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "INVALID_IMAGE_SIZE",
                isImage
                    ? "Image size must be between 1 byte and 10 MB."
                    : "File size must be between 1 byte and 25 MB."
            );
        }
    }

    private static ApiException invalidType() {
        return new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_IMAGE_TYPE",
            "Unsupported chat attachment file type."
        );
    }
}
