package com.orbit.storage.service;

import com.orbit.common.ApiException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;

/** Package-private S3 byte-level read/write operations with strict size bounds. */
final class S3ByteOps {

    private static final int BUFFER_SIZE = 8192;

    private S3ByteOps() {}

    static String putBytes(S3Client client, String bucket, String key, byte[] data, String contentType) {
        byte[] payload = data == null ? new byte[0] : data;
        PutObjectRequest.Builder builder = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentLength((long) payload.length);
        if (contentType != null && !contentType.isBlank()) {
            builder.contentType(contentType);
        }
        PutObjectResponse response = client.putObject(builder.build(), RequestBody.fromBytes(payload));
        return response.eTag();
    }

    static byte[] getBytes(S3Client client, String bucket, String key, long maxBytes) {
        GetObjectRequest request = GetObjectRequest.builder().bucket(bucket).key(key).build();
        try (ResponseInputStream<GetObjectResponse> stream = client.getObject(request)) {
            Long contentLength = stream.response().contentLength();
            if (contentLength != null && contentLength > maxBytes) {
                throw tooLarge(maxBytes);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[BUFFER_SIZE];
            long total = 0L;
            int read;
            while ((read = stream.read(buffer)) != -1) {
                total += read;
                if (total > maxBytes) {
                    throw tooLarge(maxBytes);
                }
                out.write(buffer, 0, read);
            }
            return out.toByteArray();
        } catch (NoSuchKeyException ex) {
            throw ApiException.notFound("STORAGE_OBJECT_NOT_FOUND", "File content was not found in storage.");
        } catch (S3Exception ex) {
            if (ex.statusCode() == 404) {
                throw ApiException.notFound("STORAGE_OBJECT_NOT_FOUND", "File content was not found in storage.");
            }
            throw ex;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "STORAGE_READ_FAILED", "Failed to read file content.");
        }
    }

    private static ApiException tooLarge(long maxBytes) {
        return new ApiException(
            HttpStatus.PAYLOAD_TOO_LARGE,
            "FILE_TOO_LARGE",
            "File exceeds maximum allowed size of " + maxBytes + " bytes."
        );
    }
}
