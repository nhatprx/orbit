package com.orbit.git.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.orbit.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.http.HttpStatus;

/** Safely validates and decodes GitHub Contents API file payloads. */
public final class GitHubFileContentDecoder {

    public static final long MAX_INLINE_FILE_BYTES = 1_048_576L;

    private GitHubFileContentDecoder() {
    }

    public static String decodeFileContent(JsonNode node) {
        long reportedSize = node.path("size").asLong(-1L);
        if (reportedSize > MAX_INLINE_FILE_BYTES) {
            throw fileTooLarge(reportedSize);
        }
        String encoding = readText(node, "encoding");
        String rawContent = readText(node, "content");
        if ("none".equalsIgnoreCase(encoding)) {
            throw new ApiException(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "GIT_FILE_TOO_LARGE",
                "File content exceeds GitHub inline API limits (encoding: none). Open it directly on GitHub."
            );
        }
        if (!encoding.isEmpty() && !"base64".equalsIgnoreCase(encoding)) {
            throw new ApiException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "GIT_FILE_UNSUPPORTED_ENCODING",
                "Unsupported GitHub file encoding: " + encoding + "."
            );
        }
        if (rawContent.isBlank()) {
            return "";
        }
        byte[] decoded = decodeBase64Bytes(rawContent);
        if (decoded.length > MAX_INLINE_FILE_BYTES) {
            throw fileTooLarge(decoded.length);
        }
        return new String(decoded, StandardCharsets.UTF_8);
    }

    private static byte[] decodeBase64Bytes(String encoded) {
        try {
            return Base64.getDecoder().decode(encoded.replaceAll("\\s+", ""));
        } catch (IllegalArgumentException ex) {
            throw new ApiException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "GIT_FILE_DECODE_FAILED",
                "GitHub file content could not be decoded as valid base64."
            );
        }
    }

    private static ApiException fileTooLarge(long sizeBytes) {
        return new ApiException(
            HttpStatus.PAYLOAD_TOO_LARGE,
            "GIT_FILE_TOO_LARGE",
            "File exceeds the 1 MB inline preview limit (" + sizeBytes + " bytes). Open it directly on GitHub."
        );
    }

    private static String readText(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return (v.isMissingNode() || v.isNull()) ? "" : v.asText("").trim();
    }
}
