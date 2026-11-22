package com.orbit.chat.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.dto.ChatTypingDto;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatTypingService {
    private final ChatAccessGuard guard;
    private final UserRepository users;
    private final ChatBroadcaster broadcaster;

    public ChatTypingService(ChatAccessGuard guard, UserRepository users, ChatBroadcaster broadcaster) {
        this.guard = guard;
        this.users = users;
        this.broadcaster = broadcaster;
    }

    @Transactional(readOnly = true)
    public void update(UUID userId, UUID channelId, boolean active) {
        guard.requireAccess(userId, channelId, false);
        String displayName = active
            ? users.findById(userId).map(UserEntity::getDisplayName).orElse("") : "";
        broadcaster.broadcastTyping(ChatTypingDto.of(channelId, userId, displayName, active));
    }
}
