package com.orbit.chat.dto;

import java.time.Instant;
import java.util.UUID;
import java.util.List;

public record ChatMessageDto(
    UUID id,
    UUID channelId,
    UUID senderId,
    String senderName,
    String senderUsername,
    String content,
    UUID replyToId,
    String replyToSenderName,
    String replyToSnippet,
    String attachmentName,
    String attachmentUrl,
    Instant createdAt,
    String senderAvatarUrl,
    List<ChatReactionSummaryDto> reactions
) {
    public ChatMessageDto(UUID id, UUID channelId, UUID senderId, String senderName, String senderUsername,
        String content, UUID replyToId, String replyToSenderName, String replyToSnippet, String attachmentName,
        String attachmentUrl, Instant createdAt) {
        this(id, channelId, senderId, senderName, senderUsername, content, replyToId, replyToSenderName,
            replyToSnippet, attachmentName, attachmentUrl, createdAt, null, List.of());
    }

    public ChatMessageDto(UUID id, UUID channelId, UUID senderId, String senderName, String senderUsername,
        String content, UUID replyToId, String replyToSenderName, String replyToSnippet, String attachmentName,
        String attachmentUrl, Instant createdAt, String avatarKey) {
        this(id, channelId, senderId, senderName, senderUsername, content, replyToId, replyToSenderName,
            replyToSnippet, attachmentName, attachmentUrl, createdAt, avatarKey, List.of());
    }

    public ChatMessageDto(
        UUID id,
        UUID channelId,
        UUID senderId,
        String senderName,
        String senderUsername,
        String content,
        Instant createdAt
    ) {
        this(id, channelId, senderId, senderName, senderUsername, content, null, null, null, null, null,
            createdAt, null, List.of());
    }

    public ChatMessageDto withAvatarAndReactions(String avatarUrl, List<ChatReactionSummaryDto> summaries) {
        return new ChatMessageDto(id, channelId, senderId, senderName, senderUsername, content, replyToId,
            replyToSenderName, replyToSnippet, attachmentName, attachmentUrl, createdAt, avatarUrl, summaries);
    }
}
