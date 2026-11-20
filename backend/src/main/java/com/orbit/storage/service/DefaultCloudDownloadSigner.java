package com.orbit.storage.service;

import com.orbit.common.ApiException;
import com.orbit.storage.config.CloudFrontProperties;
import com.orbit.storage.config.S3Properties;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.cloudfront.CloudFrontUtilities;
import software.amazon.awssdk.services.cloudfront.model.CannedSignerRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

@Service
public class DefaultCloudDownloadSigner implements CloudDownloadSigner {

    private final S3Properties s3Properties;
    private final CloudFrontProperties cloudFrontProperties;
    private final ObjectProvider<S3Presigner> presignerProvider;
    private volatile PrivateKey cachedPrivateKey;

    public DefaultCloudDownloadSigner(
        S3Properties s3Properties,
        CloudFrontProperties cloudFrontProperties,
        ObjectProvider<S3Presigner> presignerProvider
    ) {
        this.s3Properties = s3Properties;
        this.cloudFrontProperties = cloudFrontProperties;
        this.presignerProvider = presignerProvider;
    }

    @Override
    public SignedDownloadUrl signDownload(String storageKey, String filename, String mimeType) {
        String disposition = buildContentDisposition(filename);
        if (cloudFrontProperties.isConfigured()) {
            return signWithCloudFront(storageKey, disposition);
        }
        return signWithS3(storageKey, disposition, mimeType);
    }

    private SignedDownloadUrl signWithCloudFront(String storageKey, String disposition) {
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(cloudFrontProperties.effectiveUrlTtlMinutes()));
        String encodedDisposition = URLEncoder.encode(disposition, StandardCharsets.UTF_8).replace("+", "%20");
        String resourceUrl = "https://" + cloudFrontProperties.getDomain()
            + "/" + storageKey
            + "?response-content-disposition=" + encodedDisposition;
        CannedSignerRequest request = CannedSignerRequest.builder()
            .resourceUrl(resourceUrl)
            .privateKey(resolvePrivateKey())
            .keyPairId(cloudFrontProperties.getKeyPairId())
            .expirationDate(expiresAt)
            .build();
        String signedUrl = CloudFrontUtilities.create().getSignedUrlWithCannedPolicy(request).url();
        return new SignedDownloadUrl(signedUrl, expiresAt, "CLOUDFRONT");
    }

    private SignedDownloadUrl signWithS3(String storageKey, String disposition, String mimeType) {
        S3Presigner presigner = presignerProvider.getIfAvailable();
        if (!s3Properties.isCloudFilesConfigured() || presigner == null) {
            throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "STORAGE_NOT_CONFIGURED",
                "Cloud storage is not configured."
            );
        }
        GetObjectRequest.Builder getBuilder = GetObjectRequest.builder()
            .bucket(s3Properties.effectiveCloudFilesBucket())
            .key(storageKey)
            .responseContentDisposition(disposition);
        if (mimeType != null && !mimeType.isBlank()) {
            getBuilder.responseContentType(mimeType);
        }
        Duration ttl = Duration.ofMinutes(s3Properties.effectivePresignDurationMinutes());
        PresignedGetObjectRequest presigned = presigner.presignGetObject(
            GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(getBuilder.build())
                .build()
        );
        return new SignedDownloadUrl(presigned.url().toString(), presigned.expiration(), "S3");
    }

    private PrivateKey resolvePrivateKey() {
        PrivateKey existing = cachedPrivateKey;
        if (existing != null) {
            return existing;
        }
        try {
            String normalized = cloudFrontProperties.getPrivateKeyPem()
                .replace("\\n", "\n")
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");
            byte[] decoded = Base64.getDecoder().decode(normalized);
            PrivateKey parsed = KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(decoded));
            cachedPrivateKey = parsed;
            return parsed;
        } catch (Exception ex) {
            throw new ApiException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "CLOUDFRONT_KEY_ERROR",
                "Failed to load CloudFront signing private key."
            );
        }
    }

    static String buildContentDisposition(String filename) {
        String safeName = (filename == null || filename.isBlank()) ? "download" : filename.trim();
        String ascii = safeName.replaceAll("[\\r\\n\"\\\\]", "_").replaceAll("[^\\x20-\\x7E]", "_");
        if (ascii.isBlank()) {
            ascii = "download";
        }
        String encoded = URLEncoder.encode(safeName, StandardCharsets.UTF_8).replace("+", "%20");
        return "attachment; filename=\"" + ascii + "\"; filename*=UTF-8''" + encoded;
    }
}
