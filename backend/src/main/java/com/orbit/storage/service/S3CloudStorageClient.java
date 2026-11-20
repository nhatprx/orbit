package com.orbit.storage.service;

import com.orbit.common.ApiException;
import com.orbit.storage.config.S3Properties;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Delete;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class S3CloudStorageClient implements CloudStorageClient {

    private static final Logger LOG = LoggerFactory.getLogger(S3CloudStorageClient.class);
    private static final int DELETE_BATCH_LIMIT = 1000;

    private final S3Properties properties;
    private final ObjectProvider<S3Client> s3ClientProvider;
    private final ObjectProvider<S3Presigner> presignerProvider;

    public S3CloudStorageClient(
        S3Properties properties,
        ObjectProvider<S3Client> s3ClientProvider,
        ObjectProvider<S3Presigner> presignerProvider
    ) {
        this.properties = properties;
        this.s3ClientProvider = s3ClientProvider;
        this.presignerProvider = presignerProvider;
    }

    @Override
    public boolean isAvailable() {
        return properties.isCloudFilesConfigured()
            && s3ClientProvider.getIfAvailable() != null
            && presignerProvider.getIfAvailable() != null;
    }

    @Override
    public PresignedUploadResult presignPutObject(String key, String contentType, long contentLength, Duration ttl) {
        S3Presigner presigner = requirePresigner();
        PutObjectRequest.Builder putBuilder = PutObjectRequest.builder().bucket(bucket()).key(key);
        Map<String, String> headers = new LinkedHashMap<>();
        if (contentType != null && !contentType.isBlank()) {
            putBuilder.contentType(contentType);
            headers.put("Content-Type", contentType);
        }
        PresignedPutObjectRequest presigned = presigner.presignPutObject(
            PutObjectPresignRequest.builder().signatureDuration(ttl).putObjectRequest(putBuilder.build()).build()
        );
        return new PresignedUploadResult(presigned.url().toString(), headers, presigned.expiration());
    }

    @Override
    public String createMultipartUpload(String key, String contentType) {
        return S3MultipartOps.create(requireClient(), bucket(), key, contentType);
    }

    @Override
    public String presignUploadPart(String key, String uploadId, int partNumber, Duration ttl) {
        return S3MultipartOps.presignPart(requirePresigner(), bucket(), key, uploadId, partNumber, ttl);
    }

    @Override
    public String completeMultipartUpload(String key, String uploadId, List<CompletedPartInput> parts) {
        return S3MultipartOps.complete(requireClient(), bucket(), key, uploadId, parts);
    }

    @Override
    public void abortMultipartUpload(String key, String uploadId) {
        if (properties.isCloudFilesConfigured()) {
            S3MultipartOps.abortQuietly(s3ClientProvider.getIfAvailable(), bucket(), key, uploadId);
        }
    }

    @Override
    public Optional<HeadObjectResult> headObject(String key) {
        S3Client client = requireClient();
        try {
            HeadObjectResponse res = client.headObject(HeadObjectRequest.builder().bucket(bucket()).key(key).build());
            long length = res.contentLength() == null ? 0L : res.contentLength();
            return Optional.of(new HeadObjectResult(length, res.eTag(), res.contentType()));
        } catch (NoSuchKeyException ex) {
            return Optional.empty();
        } catch (S3Exception ex) {
            if (ex.statusCode() == 404) return Optional.empty();
            throw ex;
        }
    }

    @Override
    public void deleteObject(String key) {
        S3Client client = s3ClientProvider.getIfAvailable();
        if (!properties.isCloudFilesConfigured() || client == null || key == null || key.isBlank()) {
            return;
        }
        try {
            client.deleteObject(DeleteObjectRequest.builder().bucket(bucket()).key(key).build());
        } catch (RuntimeException ex) {
            LOG.warn("Failed to delete cloud object key={}: {}", key, ex.getMessage());
        }
    }

    @Override
    public void deleteObjects(List<String> keys) {
        S3Client client = s3ClientProvider.getIfAvailable();
        if (!properties.isCloudFilesConfigured() || client == null || keys == null || keys.isEmpty()) {
            return;
        }
        List<String> valid = keys.stream().filter(k -> k != null && !k.isBlank()).distinct().toList();
        for (int i = 0; i < valid.size(); i += DELETE_BATCH_LIMIT) {
            List<ObjectIdentifier> batch = valid.subList(i, Math.min(i + DELETE_BATCH_LIMIT, valid.size()))
                .stream().map(k -> ObjectIdentifier.builder().key(k).build()).toList();
            try {
                client.deleteObjects(
                    DeleteObjectsRequest.builder().bucket(bucket())
                        .delete(Delete.builder().objects(batch).quiet(true).build()).build()
                );
            } catch (RuntimeException ex) {
                LOG.warn("Failed to batch-delete {} cloud objects: {}", batch.size(), ex.getMessage());
            }
        }
    }

    private String bucket() {
        return properties.effectiveCloudFilesBucket();
    }

    private S3Client requireClient() {
        S3Client client = s3ClientProvider.getIfAvailable();
        if (!properties.isCloudFilesConfigured() || client == null) throw unavailable();
        return client;
    }

    private S3Presigner requirePresigner() {
        S3Presigner presigner = presignerProvider.getIfAvailable();
        if (!properties.isCloudFilesConfigured() || presigner == null) throw unavailable();
        return presigner;
    }

    private static ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_NOT_CONFIGURED", "Cloud storage is not configured.");
    }
}
