package com.orbit.storage.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface CloudStorageClient {

    record PresignedUploadResult(String url, Map<String, String> headers, Instant expiresAt) {}

    record HeadObjectResult(long contentLength, String eTag, String contentType) {}

    record CompletedPartInput(int partNumber, String eTag) {}

    boolean isAvailable();

    PresignedUploadResult presignPutObject(String key, String contentType, long contentLength, Duration ttl);

    String createMultipartUpload(String key, String contentType);

    String presignUploadPart(String key, String uploadId, int partNumber, Duration ttl);

    String completeMultipartUpload(String key, String uploadId, List<CompletedPartInput> parts);

    void abortMultipartUpload(String key, String uploadId);

    Optional<HeadObjectResult> headObject(String key);

    void deleteObject(String key);

    void deleteObjects(List<String> keys);
}
