package com.orbit.storage.controller;

import com.orbit.storage.dto.PresignDownloadRequest;
import com.orbit.storage.dto.PresignUploadRequest;
import com.orbit.storage.dto.PresignedUrlResponse;
import com.orbit.storage.dto.StorageStatusResponse;
import com.orbit.storage.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/storage")
@Tag(name = "Storage", description = "AWS S3 presigned object storage endpoints")
public class StorageController {

    private final StorageService storageService;

    public StorageController(StorageService storageService) {
        this.storageService = storageService;
    }

    @GetMapping("/status")
    @Operation(summary = "Get S3 storage status and allowed prefixes")
    public ResponseEntity<StorageStatusResponse> getStatus() {
        return ResponseEntity.ok(storageService.getStatus());
    }

    @PostMapping("/presign-upload")
    @Operation(summary = "Generate a presigned S3 PUT URL for object upload")
    public ResponseEntity<PresignedUrlResponse> presignUpload(
        @Valid @RequestBody PresignUploadRequest request
    ) {
        return ResponseEntity.ok(
            storageService.createPresignedUploadUrl(
                request.prefix(),
                request.filename(),
                request.contentType()
            )
        );
    }

    @PostMapping("/presign-download")
    @Operation(summary = "Generate a presigned S3 GET URL for object download")
    public ResponseEntity<PresignedUrlResponse> presignDownload(
        @Valid @RequestBody PresignDownloadRequest request
    ) {
        return ResponseEntity.ok(storageService.createPresignedDownloadUrl(request.key()));
    }
}
