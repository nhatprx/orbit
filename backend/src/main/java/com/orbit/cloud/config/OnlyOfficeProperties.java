package com.orbit.cloud.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Configuration properties for ONLYOFFICE Document Server integration. */
@Component
@ConfigurationProperties(prefix = "orbit.cloud.onlyoffice")
public class OnlyOfficeProperties {

    private boolean enabled = false;
    private String publicUrl = "http://localhost:8082";
    private String internalUrl = "http://localhost:8082";
    private String jwtSecret = "orbit-onlyoffice-dev-jwt-secret-change-in-production-2026";
    private String callbackBaseUrl = "http://host.docker.internal:8080";

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getPublicUrl() { return stripTrailingSlash(publicUrl); }
    public void setPublicUrl(String publicUrl) { this.publicUrl = publicUrl; }

    public String getInternalUrl() { return stripTrailingSlash(internalUrl); }
    public void setInternalUrl(String internalUrl) { this.internalUrl = internalUrl; }

    public String getJwtSecret() { return jwtSecret; }
    public void setJwtSecret(String jwtSecret) { this.jwtSecret = jwtSecret; }

    public String getCallbackBaseUrl() { return stripTrailingSlash(callbackBaseUrl); }
    public void setCallbackBaseUrl(String callbackBaseUrl) { this.callbackBaseUrl = callbackBaseUrl; }

    private static String stripTrailingSlash(String value) {
        if (value == null) return "";
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
