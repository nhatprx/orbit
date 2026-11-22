package com.orbit.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(length = 80)
    private String country;

    @Column(name = "email_preference", nullable = false)
    private boolean emailPreference;

    @Column(nullable = false, length = 20)
    private String role = "user";

    @Column(name = "workspace_id", nullable = false, length = 64)
    private String workspaceId = "ws_orbit_core";

    @Column(name = "avatar_key", length = 512)
    private String avatarKey;

    @Column(length = 300)
    private String bio;

    @Column(columnDefinition = "TEXT")
    private String introduction;

    @Column(length = 120)
    private String organization;

    @Column(length = 120)
    private String location;

    @Column(length = 255)
    private String website;

    @Column(name = "active_status_enabled", nullable = false)
    private boolean activeStatusEnabled = true;

    @Column(name = "active_status", nullable = false, length = 16)
    private String activeStatus = "ONLINE";

    @Column(name = "pinned_project_ids", columnDefinition = "TEXT")
    private String pinnedProjectIds;

    @Column(name = "totp_enabled", nullable = false)
    private boolean totpEnabled;

    @Column(name = "totp_secret", length = 128)
    private String totpSecret;

    @Column(name = "totp_pending_secret", length = 128)
    private String totpPendingSecret;

    @Column(name = "totp_backup_codes", columnDefinition = "TEXT")
    private String totpBackupCodes;

    @Embedded
    private AccountStatus accountStatus = new AccountStatus();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public boolean isEmailPreference() { return emailPreference; }
    public void setEmailPreference(boolean emailPreference) { this.emailPreference = emailPreference; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }

    public String getAvatarKey() { return avatarKey; }
    public void setAvatarKey(String avatarKey) { this.avatarKey = avatarKey; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getIntroduction() { return introduction; }
    public void setIntroduction(String introduction) { this.introduction = introduction; }

    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }

    public boolean isActiveStatusEnabled() { return activeStatusEnabled; }
    public void setActiveStatusEnabled(boolean activeStatusEnabled) { this.activeStatusEnabled = activeStatusEnabled; }

    public String getActiveStatus() { return activeStatus; }
    public void setActiveStatus(String activeStatus) { this.activeStatus = activeStatus; }

    public String getPinnedProjectIds() { return pinnedProjectIds; }
    public void setPinnedProjectIds(String pinnedProjectIds) { this.pinnedProjectIds = pinnedProjectIds; }

    public boolean isTotpEnabled() { return totpEnabled; }
    public void setTotpEnabled(boolean totpEnabled) { this.totpEnabled = totpEnabled; }

    public String getTotpSecret() { return totpSecret; }
    public void setTotpSecret(String totpSecret) { this.totpSecret = totpSecret; }

    public String getTotpPendingSecret() { return totpPendingSecret; }
    public void setTotpPendingSecret(String totpPendingSecret) { this.totpPendingSecret = totpPendingSecret; }

    public String getTotpBackupCodes() { return totpBackupCodes; }
    public void setTotpBackupCodes(String totpBackupCodes) { this.totpBackupCodes = totpBackupCodes; }

    /** Hibernate loads an all-null embedded as null, so this always returns a usable instance. */
    public AccountStatus accountStatus() {
        if (accountStatus == null) accountStatus = new AccountStatus();
        return accountStatus;
    }

    public boolean isDisabled() { return accountStatus().isDisabled(); }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
