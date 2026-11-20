package com.orbit.storage.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.orbit.common.ApiException;
import com.orbit.storage.config.CloudFrontProperties;
import com.orbit.storage.config.S3Properties;
import com.orbit.storage.service.CloudDownloadSigner.SignedDownloadUrl;
import java.net.URI;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Instant;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

class CloudDownloadSignerTest {

    @SuppressWarnings("unchecked")
    private static ObjectProvider<S3Presigner> providerOf(S3Presigner presigner) {
        ObjectProvider<S3Presigner> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(presigner);
        return provider;
    }

    @Test
    void signsWithCloudFrontWhenConfigured() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        KeyPair pair = gen.generateKeyPair();
        String pem = "-----BEGIN PRIVATE KEY-----\n"
            + Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded())
            + "\n-----END PRIVATE KEY-----";

        CloudFrontProperties cf = new CloudFrontProperties();
        cf.setEnabled(true);
        cf.setDomain("https://d12345.cloudfront.net/");
        cf.setKeyPairId("K1234567890");
        cf.setPrivateKeyPem(pem);
        cf.setUrlTtlMinutes(10);

        DefaultCloudDownloadSigner signer = new DefaultCloudDownloadSigner(new S3Properties(), cf, providerOf(null));
        SignedDownloadUrl signed = signer.signDownload("cloud/users/u1/n1/uuid", "report final.pdf", "application/pdf");

        assertEquals("CLOUDFRONT", signed.provider());
        assertTrue(signed.url().startsWith("https://d12345.cloudfront.net/cloud/users/u1/n1/uuid"));
        assertTrue(signed.url().contains("Key-Pair-Id=K1234567890"));
        assertTrue(signed.url().contains("Signature="));
        assertTrue(signed.expiresAt().isAfter(Instant.now()));
    }

    @Test
    void fallsBackToS3PresignedGetWhenCloudFrontDisabled() throws Exception {
        S3Properties s3 = new S3Properties();
        s3.setEnabled(true);
        s3.setCloudFilesBucket("orbit-cloud-files");
        CloudFrontProperties cf = new CloudFrontProperties();
        cf.setEnabled(false);

        S3Presigner presigner = mock(S3Presigner.class);
        PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
        Instant exp = Instant.now().plusSeconds(600);
        when(presigned.url()).thenReturn(URI.create("https://s3.amazonaws.com/orbit-cloud-files/k?sig=1").toURL());
        when(presigned.expiration()).thenReturn(exp);
        when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presigned);

        DefaultCloudDownloadSigner signer = new DefaultCloudDownloadSigner(s3, cf, providerOf(presigner));
        SignedDownloadUrl signed = signer.signDownload("cloud/users/u1/n1/uuid", "notes.txt", "text/plain");

        assertEquals("S3", signed.provider());
        assertEquals("https://s3.amazonaws.com/orbit-cloud-files/k?sig=1", signed.url());
        assertEquals(exp, signed.expiresAt());
    }

    @Test
    void throwsServiceUnavailableWhenNeitherConfigured() {
        DefaultCloudDownloadSigner signer = new DefaultCloudDownloadSigner(
            new S3Properties(), new CloudFrontProperties(), providerOf(null)
        );
        ApiException ex = assertThrows(
            ApiException.class,
            () -> signer.signDownload("cloud/users/u1/n1/uuid", "a.txt", "text/plain")
        );
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertEquals("STORAGE_NOT_CONFIGURED", ex.getCode());
    }
}
