package com.orbit.chat.dto;

import com.orbit.chat.service.ChatAttachmentCodec;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

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
    List<ChatReactionSummaryDto> reactions,
    Instant editedAt,
    boolean pinned,
    Instant pinnedAt,
    Instant deletedAt,
    List<ChatAttachmentDto> attachments
) {
    public ChatMessageDto(UUID id, UUID channelId, UUID senderId, String senderName, String senderUsername,
        String content, UUID replyToId, String replyToSenderName, String replyToSnippet, String attachmentName,
        String attachmentUrl, Instant createdAt) {
        this(id, channelId, senderId, senderName, senderUsername, content, replyToId, replyToSenderName,
            replyToSnippet, attachmentName, attachmentUrl, createdAt, null, List.of(), null, false, null, null, List.of());
    }

    public ChatMessageDto(UUID id, UUID channelId, UUID senderId, String senderName, String senderUsername,
        String content, UUID replyToId, String replyToSenderName, String replyToSnippet, String attachmentName,
        String attachmentUrl, Instant createdAt, String avatarKey) {
        this(id, channelId, senderId, senderName, senderUsername, content, replyToId, replyToSenderName,
            replyToSnippet, attachmentName, attachmentUrl, createdAt, avatarKey, List.of(), null, false, null, null, List.of());
    }

    public ChatMessageDto(UUID id, UUID channelId, UUID senderId, String senderName, String senderUsername,
        String content, UUID replyToId, String replyToSenderName, String replyToSnippet, String attachmentName,
        String attachmentUrl, Instant createdAt, String avatarKey, Instant editedAt, boolean pinned, Instant pinnedAt,
        Instant deletedAt, String attachmentsJson) {
        this(id, channelId, senderId, senderName, senderUsername, content, replyToId, replyToSenderName,
            replyToSnippet, attachmentName, attachmentUrl, createdAt, avatarKey, List.of(), editedAt, pinned, pinnedAt,
            deletedAt, ChatAttachmentCodec.decode(attachmentsJson));
    }

    public ChatMessageDto(UUID id, UUID channelId, UUID senderId, String senderName, String senderUsername,
        String content, UUID replyToId, String replyToSenderName, String replyToSnippet, String attachmentName,
        String attachmentUrl, Instant createdAt, String senderAvatarUrl, List<ChatReactionSummaryDto> reactions) {
        this(id, channelId, senderId, senderName, senderUsername, content, replyToId, replyToSenderName,
            replyToSnippet, attachmentName, attachmentUrl, createdAt, senderAvatarUrl, reactions, null, false, null, null, List.of());
    }

    public ChatMessageDto(UUID id, UUID channelId, UUID senderId, String senderName, String senderUsername,
        String content, Instant createdAt) {
        this(id, channelId, senderId, senderName, senderUsername, content, null, null, null, null, null,
            createdAt, null, List.of(), null, false, null, null, List.of());
    }

    public ChatMessageDto withAvatarAndReactions(String avatarUrl, List<ChatReactionSummaryDto> summaries) {
        return withResolvedMedia(avatarUrl, attachmentUrl, summaries, attachments);
    }

    public ChatMessageDto withResolvedMedia(
        String avatarUrl, String resolvedAttachmentUrl, List<ChatReactionSummaryDto> summaries,
        List<ChatAttachmentDto> resolvedAttachments
    ) {
        return new ChatMessageDto(id, channelId, senderId, senderName, senderUsername, content, replyToId,
            replyToSenderName, replyToSnippet, attachmentName, resolvedAttachmentUrl, createdAt,
            avatarUrl, summaries, editedAt, pinned, pinnedAt, deletedAt, resolvedAttachments);
    }
}
