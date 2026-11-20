package com.orbit.storage.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "orbit.storage.cloudfront")
public class CloudFrontProperties {

    private static final int DEFAULT_TTL_MINUTES = 15;
    private static final int MAX_TTL_MINUTES = 60;

    private boolean enabled = false;
    private String domain = "";
    private String keyPairId = "";
    private String privateKeyPem = "";
    private int urlTtlMinutes = DEFAULT_TTL_MINUTES;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        if (domain == null) {
            this.domain = "";
        } else {
            this.domain = domain.trim()
                .replaceFirst("^https?://", "")
                .replaceAll("/+$", "");
        }
    }

    public String getKeyPairId() {
        return keyPairId;
    }

    public void setKeyPairId(String keyPairId) {
        this.keyPairId = keyPairId == null ? "" : keyPairId.trim();
    }

    public String getPrivateKeyPem() {
        return privateKeyPem;
    }

    public void setPrivateKeyPem(String privateKeyPem) {
        this.privateKeyPem = privateKeyPem == null ? "" : privateKeyPem.trim();
    }

    public int getUrlTtlMinutes() {
        return urlTtlMinutes;
    }

    public void setUrlTtlMinutes(int urlTtlMinutes) {
        this.urlTtlMinutes = urlTtlMinutes;
    }

    public boolean isConfigured() {
        return enabled
            && !domain.isBlank()
            && !keyPairId.isBlank()
            && !privateKeyPem.isBlank();
    }

    public int effectiveUrlTtlMinutes() {
        if (urlTtlMinutes <= 0) {
            return DEFAULT_TTL_MINUTES;
        }
        return Math.min(urlTtlMinutes, MAX_TTL_MINUTES);
    }
}
