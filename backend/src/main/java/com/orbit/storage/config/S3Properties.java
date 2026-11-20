package com.orbit.storage.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "orbit.storage.s3")
public class S3Properties {

    private static final int DEFAULT_PRESIGN_MINUTES = 15;
    private static final int MAX_PRESIGN_MINUTES = 60;

    private boolean enabled = false;
    private String bucket = "";
    private String cloudFilesBucket = "";
    private String region = "ap-southeast-1";
    private String endpoint = "";
    private String publicEndpoint = "";
    private boolean pathStyleAccess = false;
    private int presignDurationMinutes = DEFAULT_PRESIGN_MINUTES;
    private String publicBaseUrl = "";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getBucket() {
        return bucket;
    }

    public void setBucket(String bucket) {
        this.bucket = trimOrEmpty(bucket);
    }

    public String getCloudFilesBucket() {
        return cloudFilesBucket;
    }

    public void setCloudFilesBucket(String cloudFilesBucket) {
        this.cloudFilesBucket = trimOrEmpty(cloudFilesBucket);
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region == null || region.isBlank() ? "ap-southeast-1" : region.trim();
    }

    public String getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = stripTrailingSlash(endpoint);
    }

    public String getPublicEndpoint() {
        return publicEndpoint;
    }

    public void setPublicEndpoint(String publicEndpoint) {
        this.publicEndpoint = stripTrailingSlash(publicEndpoint);
    }

    public boolean isPathStyleAccess() {
        return pathStyleAccess;
    }

    public void setPathStyleAccess(boolean pathStyleAccess) {
        this.pathStyleAccess = pathStyleAccess;
    }

    public int getPresignDurationMinutes() {
        return presignDurationMinutes;
    }

    public void setPresignDurationMinutes(int presignDurationMinutes) {
        this.presignDurationMinutes = presignDurationMinutes;
    }

    public String getPublicBaseUrl() {
        return publicBaseUrl;
    }

    public void setPublicBaseUrl(String publicBaseUrl) {
        this.publicBaseUrl = stripTrailingSlash(publicBaseUrl);
    }

    public boolean isConfigured() {
        return enabled && !bucket.isBlank();
    }

    public String effectiveCloudFilesBucket() {
        return !cloudFilesBucket.isBlank() ? cloudFilesBucket : bucket;
    }

    public boolean isCloudFilesConfigured() {
        return enabled && !effectiveCloudFilesBucket().isBlank();
    }

    public String effectivePresignerEndpoint() {
        return !publicEndpoint.isBlank() ? publicEndpoint : endpoint;
    }

    public int effectivePresignDurationMinutes() {
        if (presignDurationMinutes <= 0) {
            return DEFAULT_PRESIGN_MINUTES;
        }
        return Math.min(presignDurationMinutes, MAX_PRESIGN_MINUTES);
    }

    private static String trimOrEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private static String stripTrailingSlash(String value) {
        return value == null ? "" : value.trim().replaceAll("/+$", "");
    }
}
