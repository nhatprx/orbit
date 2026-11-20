package com.orbit.ai.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_provider_config")
public class AiProviderConfigEntity {

    @Id
    private Short id = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "active_provider", nullable = false, length = 24)
    private AiProviderType activeProvider = AiProviderType.BEDROCK;

    @Column(name = "bedrock_region", nullable = false, length = 64)
    private String bedrockRegion = "us-east-1";

    @Column(name = "fast_model", nullable = false, length = 160)
    private String fastModel;

    @Column(name = "pro_model", nullable = false, length = 160)
    private String proModel;

    @Column(name = "coder_model", nullable = false, length = 160)
    private String coderModel;

    @Column(name = "embed_model", nullable = false, length = 160)
    private String embedModel;

    @Column(name = "web_search_enabled", nullable = false)
    private boolean webSearchEnabled = true;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        if (id == null) id = 1;
        updatedAt = Instant.now();
    }

    public Short getId() { return id; }
    public void setId(Short id) { this.id = id; }
    public AiProviderType getActiveProvider() { return activeProvider; }
    public void setActiveProvider(AiProviderType activeProvider) { this.activeProvider = activeProvider; }
    public String getBedrockRegion() { return bedrockRegion; }
    public void setBedrockRegion(String bedrockRegion) { this.bedrockRegion = bedrockRegion; }
    public String getFastModel() { return fastModel; }
    public void setFastModel(String fastModel) { this.fastModel = fastModel; }
    public String getProModel() { return proModel; }
    public void setProModel(String proModel) { this.proModel = proModel; }
    public String getCoderModel() { return coderModel; }
    public void setCoderModel(String coderModel) { this.coderModel = coderModel; }
    public String getEmbedModel() { return embedModel; }
    public void setEmbedModel(String embedModel) { this.embedModel = embedModel; }
    public boolean isWebSearchEnabled() { return webSearchEnabled; }
    public void setWebSearchEnabled(boolean webSearchEnabled) { this.webSearchEnabled = webSearchEnabled; }
    public UUID getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(UUID updatedBy) { this.updatedBy = updatedBy; }
    public Instant getUpdatedAt() { return updatedAt; }
}
