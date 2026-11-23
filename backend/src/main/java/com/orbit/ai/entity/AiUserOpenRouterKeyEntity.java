package com.orbit.ai.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_user_openrouter_keys")
public class AiUserOpenRouterKeyEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "personal_api_key_enc", columnDefinition = "TEXT")
    private String personalApiKeyEnc;

    @Column(name = "provisioned_key_enc", columnDefinition = "TEXT")
    private String provisionedKeyEnc;

    @Column(name = "provisioned_key_hash", length = 128)
    private String provisionedKeyHash;

    @Column(name = "monthly_budget_usd", precision = 12, scale = 6)
    private BigDecimal monthlyBudgetUsd;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getPersonalApiKeyEnc() { return personalApiKeyEnc; }
    public void setPersonalApiKeyEnc(String personalApiKeyEnc) { this.personalApiKeyEnc = personalApiKeyEnc; }
    public String getProvisionedKeyEnc() { return provisionedKeyEnc; }
    public void setProvisionedKeyEnc(String provisionedKeyEnc) { this.provisionedKeyEnc = provisionedKeyEnc; }
    public String getProvisionedKeyHash() { return provisionedKeyHash; }
    public void setProvisionedKeyHash(String provisionedKeyHash) { this.provisionedKeyHash = provisionedKeyHash; }
    public BigDecimal getMonthlyBudgetUsd() { return monthlyBudgetUsd; }
    public void setMonthlyBudgetUsd(BigDecimal monthlyBudgetUsd) { this.monthlyBudgetUsd = monthlyBudgetUsd; }
    public Instant getUpdatedAt() { return updatedAt; }
}
