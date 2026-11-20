package com.orbit.cloud.controller;

import com.orbit.cloud.service.OnlyOfficeCallbackService;
import com.orbit.cloud.service.OnlyOfficeCallbackService.EditorFilePayload;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** JWT-authenticated endpoints called directly by ONLYOFFICE Document Server. */
@RestController
@RequestMapping("/api/v1/cloud/onlyoffice")
public class OnlyOfficeCallbackController {

    private final OnlyOfficeCallbackService callbackService;

    public OnlyOfficeCallbackController(OnlyOfficeCallbackService callbackService) {
        this.callbackService = callbackService;
    }

    @GetMapping("/file/{nodeId}")
    public ResponseEntity<byte[]> downloadFile(
        @PathVariable UUID nodeId,
        @RequestParam("token") String token
    ) {
        EditorFilePayload file = callbackService.downloadFileForEditor(nodeId, token);
        MediaType mediaType = parseMediaType(file.mimeType());
        ContentDisposition disposition = ContentDisposition.attachment()
            .filename(sanitizeFilename(file.fileName()))
            .build();
        return ResponseEntity.ok()
            .contentType(mediaType)
            .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
            .body(file.bytes());
    }

    @PostMapping("/callback")
    public Map<String, Integer> handleCallback(
        @RequestParam("token") String token,
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestBody(required = false) Map<String, Object> body
    ) {
        callbackService.handleCallback(token, authorization, body);
        return Map.of("error", 0);
    }

    private static MediaType parseMediaType(String mimeType) {
        try {
            return (mimeType == null || mimeType.isBlank())
                ? MediaType.APPLICATION_OCTET_STREAM
                : MediaType.parseMediaType(mimeType);
        } catch (IllegalArgumentException ex) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private static String sanitizeFilename(String name) {
        if (name == null || name.isBlank()) return "document";
        return name.replace("\"", "").replace("\r", "").replace("\n", "");
    }
}
