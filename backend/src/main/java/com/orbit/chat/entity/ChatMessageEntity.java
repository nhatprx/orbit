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

    @Column(name = "reply_to_id")
    private UUID replyToId;

    @Column(name = "reply_to_sender_name", length = 120)
    private String replyToSenderName;

    @Column(name = "reply_to_snippet", length = 240)
    private String replyToSnippet;

    @Column(name = "attachment_name", length = 255)
    private String attachmentName;

    @Column(name = "attachment_url", length = 1024)
    private String attachmentUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ChatMessageEntity() {}

    public ChatMessageEntity(UUID channelId, UUID senderId, String content) {
        this(channelId, senderId, content, null, null, null, null, null);
    }

    public ChatMessageEntity(
        UUID channelId,
        UUID senderId,
        String content,
        UUID replyToId,
        String replyToSenderName,
        String replyToSnippet,
        String attachmentName,
        String attachmentUrl
    ) {
        this.channelId = channelId;
        this.senderId = senderId;
        this.content = content;
        this.replyToId = replyToId;
        this.replyToSenderName = replyToSenderName;
        this.replyToSnippet = replyToSnippet;
        this.attachmentName = attachmentName;
        this.attachmentUrl = attachmentUrl;
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
    public UUID getReplyToId() { return replyToId; }
    public String getReplyToSenderName() { return replyToSenderName; }
    public String getReplyToSnippet() { return replyToSnippet; }
    public String getAttachmentName() { return attachmentName; }
    public String getAttachmentUrl() { return attachmentUrl; }
    public Instant getCreatedAt() { return createdAt; }
}
