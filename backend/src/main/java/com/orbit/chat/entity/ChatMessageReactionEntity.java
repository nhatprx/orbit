package com.orbit.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_message_reactions")
public class ChatMessageReactionEntity {
    @Id
    private UUID id;

    @Column(name = "message_id", nullable = false)
    private UUID messageId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "reaction_key", nullable = false, length = 16)
    private String reactionKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ChatMessageReactionEntity() { }

    public ChatMessageReactionEntity(UUID messageId, UUID userId, String reactionKey) {
        this.messageId = messageId;
        this.userId = userId;
        this.reactionKey = reactionKey;
    }

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
}
