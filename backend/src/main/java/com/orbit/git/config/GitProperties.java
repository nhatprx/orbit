package com.orbit.git.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "orbit.git")
public class GitProperties {

    static final String DEFAULT_LOCAL_SECRET =
        "orbit-local-dev-jwt-secret-key-change-me-in-production-2026-secure";

    private String githubApiUrl = "https://api.github.com";

    private String encryptionSecret;

    @Value("${orbit.jwt.secret:" + DEFAULT_LOCAL_SECRET + "}")
    private String fallbackJwtSecret = DEFAULT_LOCAL_SECRET;

    private int requestTimeoutSeconds = 15;

    private String githubAppSlug = "";
    private String githubAppId = "";
    private String githubAppPrivateKeyPem = "";

    public String getGithubApiUrl() { return githubApiUrl; }
    public void setGithubApiUrl(String githubApiUrl) { this.githubApiUrl = githubApiUrl; }

    public String getEncryptionSecret() {
        return hasDedicatedEncryptionSecret() ? encryptionSecret : fallbackJwtSecret;
    }

    public void setEncryptionSecret(String encryptionSecret) {
        this.encryptionSecret = encryptionSecret;
    }

    public String getFallbackJwtSecret() { return fallbackJwtSecret; }
    public void setFallbackJwtSecret(String fallbackJwtSecret) { this.fallbackJwtSecret = fallbackJwtSecret; }

    public boolean hasDedicatedEncryptionSecret() {
        return encryptionSecret != null && !encryptionSecret.isBlank();
    }

    public boolean isUsingJwtFallback() {
        return !hasDedicatedEncryptionSecret();
    }

    public int getRequestTimeoutSeconds() { return requestTimeoutSeconds; }
    public void setRequestTimeoutSeconds(int requestTimeoutSeconds) { this.requestTimeoutSeconds = requestTimeoutSeconds; }

    public String getGithubAppSlug() { return githubAppSlug; }
    public void setGithubAppSlug(String githubAppSlug) { this.githubAppSlug = githubAppSlug; }

    public String getGithubAppId() { return githubAppId; }
    public void setGithubAppId(String githubAppId) { this.githubAppId = githubAppId; }

    public String getGithubAppPrivateKeyPem() { return githubAppPrivateKeyPem; }
    public void setGithubAppPrivateKeyPem(String githubAppPrivateKeyPem) { this.githubAppPrivateKeyPem = githubAppPrivateKeyPem; }

    public boolean isGitHubAppConfigured() {
        return isReal(githubAppSlug) && isReal(githubAppId) && isReal(githubAppPrivateKeyPem);
    }

    private static boolean isReal(String v) {
        if (v == null || v.isBlank()) return false;
        String lower = v.trim().toLowerCase();
        return !lower.startsWith("placeholder-") && !lower.startsWith("replace-");
    }
}
