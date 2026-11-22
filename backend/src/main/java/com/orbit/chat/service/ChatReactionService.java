package com.orbit.chat.service;

import com.orbit.chat.dto.ChatReactionEvent;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.repository.ChatMessageReactionRepository;
import com.orbit.chat.repository.ChatMessageRepository;
import com.orbit.common.ApiException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.orbit.chat.dto.ChatReactionSummaryDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatReactionService {
    private static final Set<String> ALLOWED = Set.of("LIKE", "LOVE", "LAUGH", "CELEBRATE");
    private final ChatMessageReactionRepository reactions;
    private final ChatMessageRepository messages;
    private final ChatAccessGuard guard;
    private final ChatBroadcaster broadcaster;

    public ChatReactionService(ChatMessageReactionRepository reactions, ChatMessageRepository messages,
        ChatAccessGuard guard, ChatBroadcaster broadcaster) {
        this.reactions = reactions;
        this.messages = messages;
        this.guard = guard;
        this.broadcaster = broadcaster;
    }

    @Transactional(readOnly = true)
    public Map<UUID, List<ChatReactionSummaryDto>> summaries(UUID userId, List<UUID> messageIds) {
        if (messageIds.isEmpty()) return Map.of();
        return reactions.findSummaries(messageIds, userId).stream()
            .collect(Collectors.groupingBy(ChatReactionSummaryDto::messageId));
    }

    @Transactional
    public ChatReactionEvent set(UUID userId, UUID channelId, UUID messageId, String rawKey, boolean active) {
        ChatChannelEntity channel = guard.requireAccess(userId, channelId, true);
        messages.findByIdAndChannelId(messageId, channelId)
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Message not found."));
        String key = rawKey == null ? "" : rawKey.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED.contains(key)) throw ApiException.badRequest("INVALID_REACTION", "Reaction is not supported.");

        if (active) reactions.insertIfAbsent(UUID.randomUUID(), messageId, userId, key);
        else reactions.deleteByMessageIdAndUserIdAndReactionKey(messageId, userId, key);
        long count = reactions.countByMessageIdAndReactionKey(messageId, key);
        ChatReactionEvent event = new ChatReactionEvent(ChatReactionEvent.EVENT_TYPE, channel.getId(),
            messageId, key, userId, active, count);
        broadcaster.broadcastReaction(event);
        return event;
    }
}
