package com.orbit.storage.service;

import com.orbit.storage.service.CloudStorageClient.CompletedPartInput;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.AbortMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompleteMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompletedMultipartUpload;
import software.amazon.awssdk.services.s3.model.CompletedPart;
import software.amazon.awssdk.services.s3.model.CreateMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.UploadPartRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.UploadPartPresignRequest;

/** Package-private helper encapsulating AWS S3 multipart upload API calls. */
final class S3MultipartOps {

    private static final Logger LOG = LoggerFactory.getLogger(S3MultipartOps.class);

    private S3MultipartOps() {}

    static String create(S3Client client, String bucket, String key, String contentType) {
        CreateMultipartUploadRequest.Builder builder = CreateMultipartUploadRequest.builder()
            .bucket(bucket)
            .key(key);
        if (contentType != null && !contentType.isBlank()) {
            builder.contentType(contentType);
        }
        return client.createMultipartUpload(builder.build()).uploadId();
    }

    static String presignPart(
        S3Presigner presigner, String bucket, String key, String uploadId, int partNumber, Duration ttl
    ) {
        return presigner.presignUploadPart(
            UploadPartPresignRequest.builder()
                .signatureDuration(ttl)
                .uploadPartRequest(
                    UploadPartRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .uploadId(uploadId)
                        .partNumber(partNumber)
                        .build()
                )
                .build()
        ).url().toString();
    }

    static String complete(
        S3Client client, String bucket, String key, String uploadId, List<CompletedPartInput> parts
    ) {
        List<CompletedPart> completedParts = parts.stream()
            .map(p -> CompletedPart.builder().partNumber(p.partNumber()).eTag(p.eTag()).build())
            .toList();
        return client.completeMultipartUpload(
            CompleteMultipartUploadRequest.builder()
                .bucket(bucket)
                .key(key)
                .uploadId(uploadId)
                .multipartUpload(CompletedMultipartUpload.builder().parts(completedParts).build())
                .build()
        ).eTag();
    }

    static void abortQuietly(S3Client client, String bucket, String key, String uploadId) {
        if (client == null || uploadId == null || uploadId.isBlank()) {
            return;
        }
        try {
            client.abortMultipartUpload(
                AbortMultipartUploadRequest.builder().bucket(bucket).key(key).uploadId(uploadId).build()
            );
        } catch (RuntimeException ex) {
            LOG.warn("Failed to abort multipart upload key={} uploadId={}: {}", key, uploadId, ex.getMessage());
        }
    }
}
