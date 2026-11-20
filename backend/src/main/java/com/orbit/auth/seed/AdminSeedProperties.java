package com.orbit.auth.seed;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "orbit.seed-admin")
public class AdminSeedProperties {

    private boolean enabled = false;
    private String email = "";
    private String password = "";
    private String displayName = "Orbit Admin";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email == null ? "" : email.trim();
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password == null ? "" : password;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName == null || displayName.isBlank()
            ? "Orbit Admin"
            : displayName.trim();
    }

    public String getName() {
        return displayName;
    }

    public void setName(String name) {
        setDisplayName(name);
    }
}
