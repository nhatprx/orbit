package com.orbit.chat.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.entity.ChatMessageEntity;
import com.orbit.chat.repository.ChatMessageRepository;
import com.orbit.common.ApiException;
import com.orbit.common.CursorPageResponse;
import com.orbit.common.PageParams;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatMessageService {

    static final int MAX_CONTENT_LENGTH = 4000;

    private final ChatMessageRepository messages;
    private final UserRepository users;
    private final ChatAccessGuard guard;
    private final ChatBroadcaster broadcaster;
    private final ChatRateLimiter rateLimiter;

    public ChatMessageService(
        ChatMessageRepository messages,
        UserRepository users,
        ChatAccessGuard guard,
        ChatBroadcaster broadcaster,
        ChatRateLimiter rateLimiter
    ) {
        this.messages = messages;
        this.users = users;
        this.guard = guard;
        this.broadcaster = broadcaster;
        this.rateLimiter = rateLimiter;
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
        return new CursorPageResponse<>(newestFirst, nextCursor, hasMore, size);
    }

    /** Shared by REST and STOMP. Persists first, then broadcasts the committed message. */
    public ChatMessageDto send(UUID userId, UUID channelId, String rawContent) {
        guard.requireAccess(userId, channelId, true);
        String content = rawContent == null ? "" : rawContent.trim();
        if (content.isEmpty() || content.length() > MAX_CONTENT_LENGTH) {
            throw ApiException.badRequest(
                "VALIDATION_ERROR", "Message must be between 1 and " + MAX_CONTENT_LENGTH + " characters."
            );
        }
        rateLimiter.check(userId);
        UserEntity sender = users.findById(userId)
            .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));
        ChatMessageEntity saved = messages.save(new ChatMessageEntity(channelId, userId, content));
        ChatMessageDto dto = new ChatMessageDto(
            saved.getId(), channelId, userId, sender.getDisplayName(), sender.getUsername(),
            saved.getContent(), saved.getCreatedAt()
        );
        broadcaster.broadcast(dto);
        return dto;
    }
}
