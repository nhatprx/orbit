package com.orbit.chat.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.ChatReactionSummaryDto;
import com.orbit.chat.entity.ChatMessageEntity;
import com.orbit.chat.repository.ChatMessageRepository;
import com.orbit.common.ApiException;
import com.orbit.common.Timestamps;
import com.orbit.storage.service.StorageService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Handles editing sent chat messages and pinning/unpinning messages with live STOMP broadcast. */
@Service
public class ChatMessageMutationService {

    private final ChatMessageRepository messages;
    private final UserRepository users;
    private final ChatAccessGuard guard;
    private final ChatBroadcaster broadcaster;
    private final ChatReactionService reactions;
    private final StorageService storage;

    public ChatMessageMutationService(
        ChatMessageRepository messages,
        UserRepository users,
        ChatAccessGuard guard,
        ChatBroadcaster broadcaster,
        ChatReactionService reactions,
        StorageService storage
    ) {
        this.messages = messages;
        this.users = users;
        this.guard = guard;
        this.broadcaster = broadcaster;
        this.reactions = reactions;
        this.storage = storage;
    }

    @Transactional
    public ChatMessageDto editMessage(UUID userId, UUID channelId, UUID messageId, String rawContent) {
        guard.requireAccess(userId, channelId, true);
        ChatMessageEntity message = requireMessage(channelId, messageId);
        if (!message.getSenderId().equals(userId)) {
            throw ApiException.forbidden("FORBIDDEN", "You can only edit your own messages.");
        }
        String validated = ChatMessageValidator.validateContent(rawContent, message.getAttachmentUrl() != null);
        message.setContent(validated);
        message.setEditedAt(Timestamps.now());
        ChatMessageEntity saved = messages.save(message);
        return broadcastAndReturn(userId, saved);
    }

    @Transactional
    public ChatMessageDto setPinned(UUID userId, UUID channelId, UUID messageId, boolean pinned) {
        guard.requireAccess(userId, channelId, true);
        ChatMessageEntity message = requireMessage(channelId, messageId);
        message.setPinned(pinned);
        message.setPinnedAt(pinned ? Timestamps.now() : null);
        message.setPinnedBy(pinned ? userId : null);
        ChatMessageEntity saved = messages.save(message);
        return broadcastAndReturn(userId, saved);
    }

    private ChatMessageEntity requireMessage(UUID channelId, UUID messageId) {
        ChatMessageEntity entity = messages.findByIdAndChannelId(messageId, channelId)
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Message not found."));
        if (entity.getDeletedAt() != null) {
            throw ApiException.badRequest("MESSAGE_DELETED", "Deleted messages cannot be modified.");
        }
        return entity;
    }

    private ChatMessageDto broadcastAndReturn(UUID actorId, ChatMessageEntity saved) {
        UserEntity sender = users.findById(saved.getSenderId()).orElse(null);
        String senderName = sender != null ? sender.getDisplayName() : "Unknown";
        String senderUsername = sender != null ? sender.getUsername() : "unknown";
        String avatarUrl = (sender != null && storage != null) ? storage.resolveObjectUrl(sender.getAvatarKey()) : null;
        List<ChatReactionSummaryDto> summaries = reactions == null
            ? List.of()
            : reactions.summaries(actorId, List.of(saved.getId())).getOrDefault(saved.getId(), List.of());

        ChatMessageDto dto = new ChatMessageDto(
            saved.getId(), saved.getChannelId(), saved.getSenderId(), senderName, senderUsername,
            saved.getContent(), saved.getReplyToId(), saved.getReplyToSenderName(), saved.getReplyToSnippet(),
            saved.getAttachmentName(), ChatImageService.resolveAttachmentUrl(storage, saved.getAttachmentUrl()),
            saved.getCreatedAt(), avatarUrl, summaries,
            saved.getEditedAt(), saved.isPinned(), saved.getPinnedAt(), saved.getDeletedAt(),
            ChatAttachmentCodec.resolve(storage, ChatAttachmentCodec.decode(saved.getAttachmentsJson()))
        );
        broadcaster.broadcast(dto);
        return dto;
    }
}
