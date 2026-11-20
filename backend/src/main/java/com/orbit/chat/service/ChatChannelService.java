package com.orbit.chat.service;

import com.orbit.chat.dto.ChatChannelDto;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatScopeType;
import com.orbit.chat.repository.ChatChannelRepository;
import com.orbit.workspace.permission.Permissions;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** One default channel per scope for now; the schema already allows several (O-12). */
@Service
public class ChatChannelService {

    private final ChatChannelRepository channels;
    private final ChatAccessGuard guard;

    public ChatChannelService(ChatChannelRepository channels, ChatAccessGuard guard) {
        this.channels = channels;
        this.guard = guard;
    }

    @Transactional
    public List<ChatChannelDto> listWorkspace(UUID userId, UUID workspaceId) {
        guard.requireWorkspaceChat(userId, workspaceId, Permissions.CHAT_READ);
        return ensureAndList(ChatScopeType.WORKSPACE, workspaceId);
    }

    @Transactional
    public List<ChatChannelDto> listProject(UUID userId, UUID workspaceId, UUID projectId) {
        guard.requireProjectChat(userId, workspaceId, projectId, Permissions.PCHAT_READ);
        return ensureAndList(ChatScopeType.PROJECT, projectId);
    }

    @Transactional
    public void createDefaultIfAbsent(ChatScopeType scopeType, UUID scopeId) {
        channels.insertDefaultIfAbsent(UUID.randomUUID(), scopeType.name(), scopeId);
    }

    @Transactional
    public void deleteForScopes(ChatScopeType scopeType, List<UUID> scopeIds) {
        if (!scopeIds.isEmpty()) {
            channels.deleteByScope(scopeType, scopeIds);
        }
    }

    private List<ChatChannelDto> ensureAndList(ChatScopeType scopeType, UUID scopeId) {
        List<ChatChannelEntity> existing =
            channels.findByScopeTypeAndScopeIdOrderByCreatedAtAsc(scopeType, scopeId);
        if (existing.isEmpty()) {
            createDefaultIfAbsent(scopeType, scopeId);
            existing = channels.findByScopeTypeAndScopeIdOrderByCreatedAtAsc(scopeType, scopeId);
        }
        return existing.stream().map(ChatChannelService::toDto).toList();
    }

    private static ChatChannelDto toDto(ChatChannelEntity channel) {
        return new ChatChannelDto(
            channel.getId(),
            channel.getScopeType().name(),
            channel.getScopeId(),
            channel.getName(),
            channel.getDescription(),
            channel.getCreatedAt()
        );
    }
}
