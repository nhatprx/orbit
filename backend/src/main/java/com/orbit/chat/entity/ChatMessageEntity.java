package com.orbit.chat.entity;

import com.orbit.common.Timestamps;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_messages")
public class ChatMessageEntity {

    @Id
    private UUID id;

    @Column(name = "channel_id", nullable = false)
    private UUID channelId;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(nullable = false, length = 4000)
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ChatMessageEntity() {}

    public ChatMessageEntity(UUID channelId, UUID senderId, String content) {
        this.channelId = channelId;
        this.senderId = senderId;
        this.content = content;
    }

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Timestamps.now();
    }

    public UUID getId() { return id; }
    public UUID getChannelId() { return channelId; }
    public UUID getSenderId() { return senderId; }
    public String getContent() { return content; }
    public Instant getCreatedAt() { return createdAt; }
}
