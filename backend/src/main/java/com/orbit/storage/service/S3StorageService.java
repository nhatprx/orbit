package com.orbit.storage.service;

import com.orbit.common.ApiException;
import com.orbit.storage.config.S3Properties;
import com.orbit.storage.dto.PresignedUrlResponse;
import com.orbit.storage.dto.StorageStatusResponse;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class S3StorageService implements StorageService {

    public static final List<String> ALLOWED_PREFIXES = List.of("uploads/", "avatars/", "artifacts/");
    private static final int MAX_FILENAME_LENGTH = 120;

    private final S3Properties properties;
    private final ObjectProvider<S3Presigner> presignerProvider;

    public S3StorageService(S3Properties properties, ObjectProvider<S3Presigner> presignerProvider) {
        this.properties = properties;
        this.presignerProvider = presignerProvider;
    }

    @Override
    public StorageStatusResponse getStatus() {
        boolean active = properties.isConfigured() && presignerProvider.getIfAvailable() != null;
        return new StorageStatusResponse(
            active,
            "aws-s3",
            properties.isConfigured() ? properties.getBucket() : "",
            properties.getRegion(),
            properties.effectivePresignDurationMinutes(),
            ALLOWED_PREFIXES
        );
    }

    @Override
    public PresignedUrlResponse createPresignedUploadUrl(String prefix, String filename, String contentType) {
        S3Presigner presigner = requirePresigner();
        String normalizedPrefix = normalizePrefix(prefix);
        String sanitizedFilename = sanitizeFilename(filename);
        String objectKey = normalizedPrefix + UUID.randomUUID() + "-" + sanitizedFilename;

        PutObjectRequest.Builder putBuilder = PutObjectRequest.builder()
            .bucket(properties.getBucket())
            .key(objectKey);

        if (contentType != null && !contentType.isBlank()) {
            putBuilder.contentType(contentType.trim());
        }

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(properties.effectivePresignDurationMinutes()))
            .putObjectRequest(putBuilder.build())
            .build();

        PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);
        return new PresignedUrlResponse(objectKey, presigned.url().toString(), "PUT", presigned.expiration());
    }

    @Override
    public PresignedUrlResponse createPresignedDownloadUrl(String key) {
        S3Presigner presigner = requirePresigner();
        String validatedKey = validateObjectKey(key);

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
            .bucket(properties.getBucket())
            .key(validatedKey)
            .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(properties.effectivePresignDurationMinutes()))
            .getObjectRequest(getObjectRequest)
            .build();

        PresignedGetObjectRequest presigned = presigner.presignGetObject(presignRequest);
        return new PresignedUrlResponse(validatedKey, presigned.url().toString(), "GET", presigned.expiration());
    }

    private S3Presigner requirePresigner() {
        S3Presigner presigner = presignerProvider.getIfAvailable();
        if (!properties.isConfigured() || presigner == null) {
            throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "STORAGE_NOT_CONFIGURED",
                "S3 storage is not configured."
            );
        }
        return presigner;
    }

    private String normalizePrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            throw invalidPrefixException();
        }
        String trimmed = prefix.trim();
        String normalized = trimmed.endsWith("/") ? trimmed : trimmed + "/";
        if (!ALLOWED_PREFIXES.contains(normalized)) {
            throw invalidPrefixException();
        }
        return normalized;
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            throw invalidFilenameException();
        }
        String baseName = filename.trim().replace('\\', '/');
        int lastSlash = baseName.lastIndexOf('/');
        if (lastSlash >= 0) {
            baseName = baseName.substring(lastSlash + 1);
        }
        String cleaned = baseName
            .replace("..", "")
            .replaceAll("[^A-Za-z0-9._-]", "_")
            .replaceAll("^[._-]+", "");

        if (cleaned.isBlank()) {
            throw invalidFilenameException();
        }
        if (cleaned.length() > MAX_FILENAME_LENGTH) {
            cleaned = cleaned.substring(cleaned.length() - MAX_FILENAME_LENGTH);
        }
        return cleaned;
    }

    private String validateObjectKey(String key) {
        if (key == null || key.isBlank()) {
            throw invalidKeyException();
        }
        String trimmed = key.trim();
        if (trimmed.contains("..") || trimmed.contains("\\") || trimmed.startsWith("/")) {
            throw invalidKeyException();
        }
        for (String allowed : ALLOWED_PREFIXES) {
            if (trimmed.startsWith(allowed) && trimmed.length() > allowed.length()) {
                return trimmed;
            }
        }
        throw invalidKeyException();
    }

    private ApiException invalidPrefixException() {
        return new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_STORAGE_PREFIX",
            "Prefix must be one of: uploads/, avatars/, artifacts/."
        );
    }

    private ApiException invalidFilenameException() {
        return new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_FILENAME",
            "Filename contains no valid characters."
        );
    }

    private ApiException invalidKeyException() {
        return new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_STORAGE_KEY",
            "Object key must start with an allowed prefix."
        );
    }
}
