package com.orbit.whiteboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.orbit.common.ApiException;
import com.orbit.whiteboard.dto.SaveWhiteboardSceneRequest;
import com.orbit.whiteboard.dto.UpsertWhiteboardAssetRequest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Input validation and serialization rules for Whiteboard metadata, scenes, and binary assets. */
public final class WhiteboardValidation {

    public static final int MAX_TITLE_LENGTH = 160;
    public static final int MAX_DESCRIPTION_LENGTH = 500;
    public static final int MAX_SCENE_BYTES = 10 * 1024 * 1024;
    public static final int MAX_ASSET_BYTES = 5 * 1024 * 1024;
    public static final int MAX_ASSETS_PER_BOARD = 50;

    private static final Pattern FILE_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{1,128}$");
    private static final Set<String> ALLOWED_ASSET_MIMES = Set.of(
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "image/svg+xml"
    );

    public record ValidatedAsset(String fileId, String mimeType, String dataUrl, int byteSize) {}

    private WhiteboardValidation() {}

    public static String requireTitle(String raw) {
        if (raw == null || raw.isBlank()) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Title must not be blank.");
        }
        String trimmed = raw.trim();
        if (trimmed.length() > MAX_TITLE_LENGTH) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Title must be at most 160 characters.");
        }
        return trimmed;
    }

    public static String normalizeDescription(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim();
        if (trimmed.length() > MAX_DESCRIPTION_LENGTH) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Description must be at most 500 characters.");
        }
        return trimmed;
    }

    public static String validateAndSerializeScene(SaveWhiteboardSceneRequest request, ObjectMapper mapper) {
        if (request == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Scene payload is required.");
        }
        if (request.expectedVersion() == null || request.expectedVersion() < 1) {
            throw ApiException.badRequest("VALIDATION_ERROR", "expectedVersion must be at least 1.");
        }
        if (request.elementCount() == null || request.elementCount() < 0) {
            throw ApiException.badRequest("VALIDATION_ERROR", "elementCount must be zero or positive.");
        }
        if (request.sceneJson() == null || !request.sceneJson().isObject()) {
            throw ApiException.badRequest("VALIDATION_ERROR", "sceneJson must be a JSON object.");
        }
        byte[] bytes;
        try {
            bytes = mapper.writeValueAsBytes(request.sceneJson());
        } catch (JsonProcessingException ex) {
            throw ApiException.badRequest("VALIDATION_ERROR", "sceneJson could not be serialized.");
        }
        if (bytes.length > MAX_SCENE_BYTES) {
            throw ApiException.badRequest(
                "WHITEBOARD_SCENE_TOO_LARGE",
                "Whiteboard scene exceeds the 10 MB size limit."
            );
        }
        return new String(bytes, StandardCharsets.UTF_8);
    }

    public static String requireFileId(String fileId) {
        if (fileId == null || !FILE_ID_PATTERN.matcher(fileId).matches()) {
            throw ApiException.badRequest("VALIDATION_ERROR", "fileId must match ^[A-Za-z0-9_-]{1,128}$.");
        }
        return fileId;
    }

    public static ValidatedAsset validateAsset(String fileId, UpsertWhiteboardAssetRequest request) {
        String validId = requireFileId(fileId);
        if (request == null || request.mimeType() == null || request.dataUrl() == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "mimeType and dataUrl are required.");
        }
        String mime = request.mimeType().trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_ASSET_MIMES.contains(mime)) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Unsupported asset MIME type.");
        }
        String dataUrl = request.dataUrl();
        String expectedPrefix = "data:" + mime + ";base64,";
        if (!dataUrl.startsWith(expectedPrefix)) {
            throw ApiException.badRequest("VALIDATION_ERROR", "dataUrl must start with data:<mimeType>;base64,.");
        }
        if (dataUrl.getBytes(StandardCharsets.UTF_8).length > MAX_ASSET_BYTES) {
            throw ApiException.badRequest(
                "WHITEBOARD_ASSET_TOO_LARGE",
                "Whiteboard asset exceeds the 5 MB size limit."
            );
        }
        String base64Payload = dataUrl.substring(expectedPrefix.length());
        if (base64Payload.isEmpty()) {
            throw ApiException.badRequest("VALIDATION_ERROR", "dataUrl must contain base64 image data.");
        }
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(base64Payload);
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("VALIDATION_ERROR", "dataUrl contains invalid base64 content.");
        }
        if (decoded.length > MAX_ASSET_BYTES) {
            throw ApiException.badRequest(
                "WHITEBOARD_ASSET_TOO_LARGE",
                "Whiteboard asset exceeds the 5 MB size limit."
            );
        }
        return new ValidatedAsset(validId, mime, dataUrl, decoded.length);
    }

    public static ObjectNode defaultScene(ObjectMapper mapper) {
        ObjectNode root = mapper.createObjectNode();
        root.put("type", "excalidraw");
        root.put("version", 2);
        root.putArray("elements");
        root.putObject("appState");
        return root;
    }

    public static String toSearchPattern(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) {
            return null;
        }
        String escaped = rawQuery.trim()
            .toLowerCase(Locale.ROOT)
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
