package com.orbit.storage.service;

import com.orbit.common.ApiException;
import com.orbit.storage.config.S3Properties;
import com.orbit.storage.dto.PresignedUrlResponse;
import com.orbit.storage.dto.StorageStatusResponse;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class S3StorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);
    public static final List<String> ALLOWED_PREFIXES = S3KeyValidator.ALLOWED_PREFIXES;

    private final S3Properties properties;
    private final ObjectProvider<S3Presigner> presignerProvider;
    private final ObjectProvider<S3Client> s3ClientProvider;

    @Autowired
    public S3StorageService(
        S3Properties properties,
        ObjectProvider<S3Presigner> presignerProvider,
        ObjectProvider<S3Client> s3ClientProvider
    ) {
        this.properties = properties;
        this.presignerProvider = presignerProvider;
        this.s3ClientProvider = s3ClientProvider;
    }

    S3StorageService(S3Properties properties, ObjectProvider<S3Presigner> presignerProvider) {
        this(properties, presignerProvider, null);
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
        String normalizedPrefix = S3KeyValidator.normalizePrefix(prefix);
        String sanitizedFilename = S3KeyValidator.sanitizeFilename(filename);
        String objectKey = normalizedPrefix + UUID.randomUUID() + "-" + sanitizedFilename;
        return createPresignedUploadUrlForKey(objectKey, contentType);
    }

    @Override
    public PresignedUrlResponse createPresignedUploadUrlForKey(String objectKey, String contentType) {
        S3Presigner presigner = requirePresigner();
        String validatedKey = S3KeyValidator.validateObjectKey(objectKey);

        PutObjectRequest.Builder putBuilder = PutObjectRequest.builder()
            .bucket(properties.getBucket())
            .key(validatedKey);

        if (contentType != null && !contentType.isBlank()) {
            putBuilder.contentType(contentType.trim());
        }

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(properties.effectivePresignDurationMinutes()))
            .putObjectRequest(putBuilder.build())
            .build();

        PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);
        return new PresignedUrlResponse(validatedKey, presigned.url().toString(), "PUT", presigned.expiration());
    }

    @Override
    public PresignedUrlResponse createPresignedDownloadUrl(String key) {
        S3Presigner presigner = requirePresigner();
        String validatedKey = S3KeyValidator.validateObjectKey(key);

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

    @Override
    public String resolveObjectUrl(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        String validatedKey = S3KeyValidator.validateObjectKey(key);
        if (!properties.getPublicBaseUrl().isBlank()) {
            return properties.getPublicBaseUrl() + "/" + validatedKey;
        }
        if (!properties.isConfigured() || presignerProvider.getIfAvailable() == null) {
            return null;
        }
        return createPresignedDownloadUrl(validatedKey).url();
    }

    @Override
    public void deleteObject(String key) {
        if (key == null || key.isBlank() || !properties.isConfigured() || s3ClientProvider == null) {
            return;
        }
        S3Client client = s3ClientProvider.getIfAvailable();
        if (client == null) {
            return;
        }
        try {
            String validatedKey = S3KeyValidator.validateObjectKey(key);
            client.deleteObject(
                DeleteObjectRequest.builder()
                    .bucket(properties.getBucket())
                    .key(validatedKey)
                    .build()
            );
        } catch (RuntimeException ex) {
            log.warn("Failed to delete S3 object key={}: {}", key, ex.getMessage());
        }
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
}
