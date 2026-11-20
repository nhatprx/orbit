package com.orbit.storage.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "orbit.storage.s3")
public class S3Properties {

    private static final int DEFAULT_PRESIGN_MINUTES = 15;
    private static final int MAX_PRESIGN_MINUTES = 60;

    private boolean enabled = false;
    private String bucket = "";
    private String region = "ap-southeast-1";
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
        this.bucket = bucket == null ? "" : bucket.trim();
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region == null || region.isBlank() ? "ap-southeast-1" : region.trim();
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
        if (publicBaseUrl == null) {
            this.publicBaseUrl = "";
        } else {
            this.publicBaseUrl = publicBaseUrl.trim().replaceAll("/+$", "");
        }
    }

    public boolean isConfigured() {
        return enabled && bucket != null && !bucket.isBlank();
    }

    public int effectivePresignDurationMinutes() {
        if (presignDurationMinutes <= 0) {
            return DEFAULT_PRESIGN_MINUTES;
        }
        return Math.min(presignDurationMinutes, MAX_PRESIGN_MINUTES);
    }
}
