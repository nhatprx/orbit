package com.orbit.git.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "orbit.git")
public class GitProperties {

    private String githubApiUrl = "https://api.github.com";

    @Value("${orbit.git.encryption-secret:${orbit.jwt.secret:orbit-local-dev-jwt-secret-key-change-me-in-production-2026-secure}}")
    private String encryptionSecret = "orbit-local-dev-jwt-secret-key-change-me-in-production-2026-secure";

    private int requestTimeoutSeconds = 15;

    public String getGithubApiUrl() { return githubApiUrl; }
    public void setGithubApiUrl(String githubApiUrl) { this.githubApiUrl = githubApiUrl; }

    public String getEncryptionSecret() { return encryptionSecret; }
    public void setEncryptionSecret(String encryptionSecret) { this.encryptionSecret = encryptionSecret; }

    public int getRequestTimeoutSeconds() { return requestTimeoutSeconds; }
    public void setRequestTimeoutSeconds(int requestTimeoutSeconds) { this.requestTimeoutSeconds = requestTimeoutSeconds; }
}
