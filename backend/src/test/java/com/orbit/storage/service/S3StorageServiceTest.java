package com.orbit.storage.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.common.ApiException;
import com.orbit.storage.config.S3Properties;
import com.orbit.storage.dto.PresignedUrlResponse;
import com.orbit.storage.dto.StorageStatusResponse;
import java.net.URI;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

class S3StorageServiceTest {

    @SuppressWarnings("unchecked")
    private ObjectProvider<S3Presigner> providerOf(S3Presigner presigner) {
        ObjectProvider<S3Presigner> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(presigner);
        return provider;
    }

    @Test
    void returnsDisabledStatusWhenBucketMissing() {
        S3Properties props = new S3Properties();
        props.setEnabled(false);
        S3StorageService service = new S3StorageService(props, providerOf(null));

        StorageStatusResponse status = service.getStatus();
        assertFalse(status.enabled());
        assertEquals("", status.bucket());
        assertEquals(S3StorageService.ALLOWED_PREFIXES, status.allowedPrefixes());
    }

    @Test
    void rejectsPresignWhenStorageDisabled() {
        S3Properties props = new S3Properties();
        S3StorageService service = new S3StorageService(props, providerOf(null));

        ApiException ex = assertThrows(
            ApiException.class,
            () -> service.createPresignedUploadUrl("uploads/", "report.pdf", "application/pdf")
        );
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertEquals("STORAGE_NOT_CONFIGURED", ex.getCode());
    }

    @Test
    void createsPresignedUploadAndSanitizesFilename() throws Exception {
        S3Properties props = new S3Properties();
        props.setEnabled(true);
        props.setBucket("orbit-storage-test");
        props.setRegion("ap-southeast-1");

        S3Presigner presigner = mock(S3Presigner.class);
        PresignedPutObjectRequest presigned = mock(PresignedPutObjectRequest.class);
        Instant expiry = Instant.now().plusSeconds(900);
        when(presigned.url()).thenReturn(URI.create("https://s3.ap-southeast-1.amazonaws.com/signed-put").toURL());
        when(presigned.expiration()).thenReturn(expiry);
        when(presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(presigned);

        S3StorageService service = new S3StorageService(props, providerOf(presigner));
        PresignedUrlResponse result = service.createPresignedUploadUrl(
            "avatars",
            "../../my avatar (1).png",
            "image/png"
        );

        assertTrue(result.key().startsWith("avatars/"));
        assertTrue(result.key().endsWith("-my_avatar__1_.png"));
        assertEquals("PUT", result.method());
        assertEquals(expiry, result.expiresAt());
    }

    @Test
    void rejectsDisallowedPrefixAndTraversalDownloadKey() {
        S3Properties props = new S3Properties();
        props.setEnabled(true);
        props.setBucket("orbit-storage-test");
        S3Presigner presigner = mock(S3Presigner.class);
        S3StorageService service = new S3StorageService(props, providerOf(presigner));

        ApiException prefixEx = assertThrows(
            ApiException.class,
            () -> service.createPresignedUploadUrl("secrets/", "key.pem", "text/plain")
        );
        assertEquals(HttpStatus.BAD_REQUEST, prefixEx.getStatus());

        ApiException keyEx = assertThrows(
            ApiException.class,
            () -> service.createPresignedDownloadUrl("uploads/../secrets/key.pem")
        );
        assertEquals(HttpStatus.BAD_REQUEST, keyEx.getStatus());
    }

    @Test
    void createsPresignedDownloadForValidKey() throws Exception {
        S3Properties props = new S3Properties();
        props.setEnabled(true);
        props.setBucket("orbit-storage-test");

        S3Presigner presigner = mock(S3Presigner.class);
        PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
        Instant expiry = Instant.now().plusSeconds(900);
        when(presigned.url()).thenReturn(URI.create("https://s3.ap-southeast-1.amazonaws.com/signed-get").toURL());
        when(presigned.expiration()).thenReturn(expiry);
        when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presigned);

        S3StorageService service = new S3StorageService(props, providerOf(presigner));
        PresignedUrlResponse result = service.createPresignedDownloadUrl("artifacts/build-123.tar.gz");

        assertEquals("artifacts/build-123.tar.gz", result.key());
        assertEquals("GET", result.method());
        assertEquals(expiry, result.expiresAt());
    }

    @Test
    void resolvesPublicBaseUrlOrPresignedUrlAndDeletesSafely() throws Exception {
        S3Properties props = new S3Properties();
        props.setEnabled(true);
        props.setBucket("orbit-storage-test");
        props.setPublicBaseUrl("https://cdn.orbit.dev/");

        S3Presigner presigner = mock(S3Presigner.class);
        S3Client s3Client = mock(S3Client.class);
        @SuppressWarnings("unchecked")
        ObjectProvider<S3Client> clientProvider = mock(ObjectProvider.class);
        when(clientProvider.getIfAvailable()).thenReturn(s3Client);

        S3StorageService service = new S3StorageService(props, providerOf(presigner), clientProvider);

        assertEquals("https://cdn.orbit.dev/avatars/u1/a.png", service.resolveObjectUrl("avatars/u1/a.png"));
        verify(presigner, never()).presignGetObject(any(GetObjectPresignRequest.class));

        props.setPublicBaseUrl("");
        PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
        when(presigned.url()).thenReturn(URI.create("https://s3.ap-southeast-1.amazonaws.com/signed-avatar").toURL());
        when(presigned.expiration()).thenReturn(Instant.now().plusSeconds(600));
        when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presigned);

        assertEquals("https://s3.ap-southeast-1.amazonaws.com/signed-avatar", service.resolveObjectUrl("avatars/u1/a.png"));

        service.deleteObject("avatars/u1/a.png");
        verify(s3Client).deleteObject(any(DeleteObjectRequest.class));

        props.setEnabled(false);
        assertNull(service.resolveObjectUrl("avatars/u1/a.png"));
    }
}
