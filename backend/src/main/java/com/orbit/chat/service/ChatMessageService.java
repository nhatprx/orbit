package com.orbit.chat.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.dto.ChatMessageDeletedDto;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.SendChatMessageRequest;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatMessageEntity;
import com.orbit.chat.repository.ChatMessageRepository;
import com.orbit.common.ApiException;
import com.orbit.common.CursorPageResponse;
import com.orbit.common.PageParams;
import com.orbit.common.Timestamps;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import com.orbit.storage.service.StorageService;

@Service
public class ChatMessageService {

    static final int MAX_CONTENT_LENGTH = ChatMessageValidator.MAX_CONTENT_LENGTH;

    private final ChatMessageRepository messages;
    private final UserRepository users;
    private final ChatAccessGuard guard;
    private final ChatBroadcaster broadcaster;
    private final ChatRateLimiter rateLimiter;
    private final ChatReactionService reactions;
    private final StorageService storage;
    private ChatMentionNotificationService mentionNotifier;

    @Autowired
    public ChatMessageService(
        ChatMessageRepository messages,
        UserRepository users,
        ChatAccessGuard guard,
        ChatBroadcaster broadcaster,
        ChatRateLimiter rateLimiter,
        ChatReactionService reactions,
        StorageService storage
    ) {
        this.messages = messages;
        this.users = users;
        this.guard = guard;
        this.broadcaster = broadcaster;
        this.rateLimiter = rateLimiter;
        this.reactions = reactions;
        this.storage = storage;
    }

    @Autowired(required = false)
    void setMentionNotifier(ChatMentionNotificationService mentionNotifier) {
        this.mentionNotifier = mentionNotifier;
    }

    public ChatMessageService(ChatMessageRepository messages, UserRepository users, ChatAccessGuard guard,
        ChatBroadcaster broadcaster, ChatRateLimiter rateLimiter) {
        this(messages, users, guard, broadcaster, rateLimiter, null, null);
    }

    /** Chronological page, newest page first; {@code nextCursor} points at older messages. */
    @Transactional(readOnly = true)
    public CursorPageResponse<ChatMessageDto> history(UUID userId, UUID channelId, String cursor, int limit) {
        guard.requireAccess(userId, channelId, false);
        int size = PageParams.clampSize(limit);
        PageRequest page = PageRequest.of(0, size + 1);
        List<ChatMessageDto> rows;
        if (cursor == null || cursor.isBlank()) {
            rows = messages.findLatest(channelId, page);
        } else {
            ChatCursor decoded = ChatCursor.decode(cursor);
            rows = messages.findBefore(channelId, decoded.createdAt(), decoded.id(), page);
        }
        boolean hasMore = rows.size() > size;
        List<ChatMessageDto> newestFirst = new ArrayList<>(rows.subList(0, Math.min(size, rows.size())));
        String nextCursor = null;
        if (hasMore) {
            ChatMessageDto oldest = newestFirst.getLast();
            nextCursor = ChatCursor.encode(oldest.createdAt(), oldest.id());
        }
        Collections.reverse(newestFirst);
        List<UUID> ids = newestFirst.stream().map(ChatMessageDto::id).toList();
        var summaries = reactions == null ? java.util.Map.<UUID, List<com.orbit.chat.dto.ChatReactionSummaryDto>>of()
            : reactions.summaries(userId, ids);
        List<ChatMessageDto> enriched = newestFirst.stream().map(row -> row.withResolvedMedia(
            storage == null ? null : storage.resolveObjectUrl(row.senderAvatarUrl()),
            ChatImageService.resolveAttachmentUrl(storage, row.attachmentUrl()),
            summaries.getOrDefault(row.id(), List.of()),
            ChatAttachmentCodec.resolve(storage, row.attachments()))).toList();
        return new CursorPageResponse<>(enriched, nextCursor, hasMore, size);
    }

    public ChatMessageDto send(UUID userId, UUID channelId, String rawContent) {
        return send(userId, channelId, new SendChatMessageRequest(rawContent));
    }

    /** Shared by REST and STOMP. Persists first, then broadcasts the committed message. */
    public ChatMessageDto send(UUID userId, UUID channelId, SendChatMessageRequest request) {
        ChatChannelEntity channel = guard.requireAccess(userId, channelId, true);
        if (request == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Message payload is required.");
        }
        var attachments = ChatAttachmentCodec.validateList(
            request.attachments(), request.attachmentName(), request.attachmentUrl()
        );
        String attachmentName = attachments.isEmpty() ? null : attachments.getFirst().name();
        String attachmentUrl = attachments.isEmpty() ? null : attachments.getFirst().url();
        String content = ChatMessageValidator.validateContent(request.content(), !attachments.isEmpty());

        UUID replyToId = null;
        String replySenderName = null;
        String replySnippet = null;
        if (request.replyToId() != null) {
            ChatMessageEntity target = messages.findByIdAndChannelId(request.replyToId(), channelId)
                .orElseThrow(() -> ApiException.badRequest(
                    "INVALID_REPLY_TARGET", "Reply target message was not found in this channel."
                ));
            replyToId = target.getId();
            replySenderName = ChatMessageValidator.formatReplySender(
                users.findById(target.getSenderId()).map(UserEntity::getDisplayName).orElse("Unknown")
            );
            replySnippet = ChatMessageValidator.formatReplySnippet(target.getContent());
        }

        rateLimiter.check(userId);
        UserEntity sender = users.findById(userId)
            .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));
        ChatMessageEntity entity = new ChatMessageEntity(
            channelId, userId, content,
            replyToId, replySenderName, replySnippet,
            attachmentName, attachmentUrl
        );
        entity.setAttachmentsJson(ChatAttachmentCodec.encode(attachments));
        ChatMessageEntity saved = messages.save(entity);
        ChatMessageDto dto = new ChatMessageDto(
            saved.getId(), channelId, userId, sender.getDisplayName(), sender.getUsername(),
            saved.getContent(), saved.getReplyToId(), saved.getReplyToSenderName(),
            saved.getReplyToSnippet(), saved.getAttachmentName(),
            ChatImageService.resolveAttachmentUrl(storage, saved.getAttachmentUrl()),
            saved.getCreatedAt(), storage == null ? null : storage.resolveObjectUrl(sender.getAvatarKey()),
            List.of(), null, false, null, null, ChatAttachmentCodec.resolve(storage, attachments)
        );
        broadcaster.broadcast(dto);
        if (mentionNotifier != null && !content.isEmpty()) {
            mentionNotifier.notifyMentions(channel, sender, content);
        }
        return dto;
    }

    @Transactional
    public void deleteMessage(UUID userId, UUID channelId, UUID messageId) {
        ChatChannelEntity channel = guard.requireAccess(userId, channelId, false);
        ChatMessageEntity message = messages.findByIdAndChannelId(messageId, channelId)
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Message not found."));
        if (!message.getSenderId().equals(userId) && !guard.canManage(userId, channel)) {
            throw ApiException.forbidden("FORBIDDEN", "You can only delete your own messages.");
        }
        message.setDeletedAt(Timestamps.now());
        message.setContent("");
        message.setAttachmentName(null);
        message.setAttachmentUrl(null);
        message.setAttachmentsJson(null);
        message.setPinned(false);
        message.setPinnedAt(null);
        message.setPinnedBy(null);
        messages.save(message);
        broadcaster.broadcastDeletion(ChatMessageDeletedDto.of(channelId, messageId));
    }
}
