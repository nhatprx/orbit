package com.orbit.chat.entity;

import com.orbit.common.Timestamps;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_channels")
public class ChatChannelEntity {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", nullable = false, length = 16)
    private ChatScopeType scopeType;

    @Column(name = "scope_id", nullable = false)
    private UUID scopeId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type", nullable = false, length = 16)
    private ChatChannelType channelType = ChatChannelType.TEXT;

    @Column(nullable = false, length = 64)
    private String category = "TEXT CHANNELS";

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(name = "parent_channel_id")
    private UUID parentChannelId;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ChatChannelEntity() {}

    public ChatChannelEntity(
        ChatScopeType scopeType,
        UUID scopeId,
        String name,
        String description,
        ChatChannelType channelType,
        String category,
        UUID createdBy
    ) {
        this.scopeType = scopeType;
        this.scopeId = scopeId;
        this.name = name;
        this.description = description;
        this.channelType = channelType == null ? ChatChannelType.TEXT : channelType;
        this.category = category == null || category.isBlank()
            ? defaultCategory(this.channelType)
            : category;
        this.createdBy = createdBy;
    }

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Timestamps.now();
        if (channelType == null) channelType = ChatChannelType.TEXT;
        if (category == null || category.isBlank()) {
            category = defaultCategory(channelType);
        }
    }

    public UUID getId() { return id; }
    public ChatScopeType getScopeType() { return scopeType; }
    public UUID getScopeId() { return scopeId; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public ChatChannelType getChannelType() { return channelType == null ? ChatChannelType.TEXT : channelType; }
    public String getCategory() { return category; }
    public String getAvatarUrl() { return avatarUrl; }
    public UUID getParentChannelId() { return parentChannelId; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }

    public void setName(String name) { this.name = name; }
    public void setDescription(String description) { this.description = description; }
    public void setCategory(String category) { this.category = category; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public void setParentChannelId(UUID parentChannelId) { this.parentChannelId = parentChannelId; }

    private static String defaultCategory(ChatChannelType type) {
        return switch (type) {
            case VOICE -> "VOICE CHANNELS";
            case FORUM -> "FORUMS";
            default -> "TEXT CHANNELS";
        };
    }
}
