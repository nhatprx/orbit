package com.orbit.chat.service;

import com.orbit.chat.dto.ChatChannelDto;
import com.orbit.chat.dto.CreateChatChannelRequest;
import com.orbit.chat.dto.UpdateChatChannelRequest;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatChannelType;
import com.orbit.chat.entity.ChatScopeType;
import com.orbit.chat.repository.ChatChannelRepository;
import com.orbit.common.ApiException;
import com.orbit.workspace.permission.Permissions;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manages text and voice channels scoped to a workspace or project. */
@Service
public class ChatChannelService {

    private final ChatChannelRepository channels;
    private final ChatAccessGuard guard;
    private final ChatVoiceService voiceService;

    public ChatChannelService(ChatChannelRepository channels, ChatAccessGuard guard, ChatVoiceService voiceService) {
        this.channels = channels;
        this.guard = guard;
        this.voiceService = voiceService;
    }

    @Transactional
    public List<ChatChannelDto> listWorkspace(UUID userId, UUID workspaceId) {
        return listWorkspace(userId, workspaceId, false);
    }

    @Transactional
    public List<ChatChannelDto> listWorkspace(UUID userId, UUID workspaceId, boolean seedVoice) {
        guard.requireWorkspaceChat(userId, workspaceId, Permissions.CHAT_READ);
        return ensureAndList(ChatScopeType.WORKSPACE, workspaceId, seedVoice);
    }

    @Transactional
    public List<ChatChannelDto> listProject(UUID userId, UUID workspaceId, UUID projectId) {
        return listProject(userId, workspaceId, projectId, false);
    }

    @Transactional
    public List<ChatChannelDto> listProject(UUID userId, UUID workspaceId, UUID projectId, boolean seedVoice) {
        guard.requireProjectChat(userId, workspaceId, projectId, Permissions.PCHAT_READ);
        return ensureAndList(ChatScopeType.PROJECT, projectId, seedVoice);
    }

    @Transactional
    public ChatChannelDto createWorkspaceChannel(UUID userId, UUID workspaceId, CreateChatChannelRequest request) {
        guard.requireWorkspaceChat(userId, workspaceId, Permissions.CHAT_MANAGE);
        return createChannel(ChatScopeType.WORKSPACE, workspaceId, userId, request);
    }

    @Transactional
    public ChatChannelDto createProjectChannel(
        UUID userId, UUID workspaceId, UUID projectId, CreateChatChannelRequest request
    ) {
        guard.requireProjectChat(userId, workspaceId, projectId, Permissions.PCHAT_MANAGE);
        return createChannel(ChatScopeType.PROJECT, projectId, userId, request);
    }

    @Transactional
    public ChatChannelDto updateChannel(UUID userId, UUID channelId, UpdateChatChannelRequest request) {
        ChatChannelEntity channel = guard.requireManageAccess(userId, channelId);
        if (request == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Update payload is required.");
        }
        if (request.name() != null) {
            String normalized = ChatChannelValidator.normalizeName(request.name(), channel.getChannelType());
            boolean duplicate = channels.existsByScopeTypeAndScopeIdAndNameIgnoreCaseAndIdNot(
                channel.getScopeType(), channel.getScopeId(), normalized, channel.getId()
            );
            if (duplicate) {
                throw ApiException.conflict("CHANNEL_EXISTS", "A channel with that name already exists.");
            }
            channel.setName(normalized);
        }
        if (request.description() != null) {
            channel.setDescription(ChatChannelValidator.normalizeDescription(request.description()));
        }
        if (request.category() != null) {
            channel.setCategory(ChatChannelValidator.normalizeCategory(request.category(), channel.getChannelType()));
        }
        return toDto(saveSafely(channel));
    }

    @Transactional
    public void deleteChannel(UUID userId, UUID channelId) {
        ChatChannelEntity channel = guard.requireManageAccess(userId, channelId);
        if (ChatChannelValidator.DEFAULT_CHANNEL.equalsIgnoreCase(channel.getName())
            && channel.getChannelType() == ChatChannelType.TEXT) {
            throw ApiException.badRequest("CANNOT_DELETE_DEFAULT", "The default general channel cannot be deleted.");
        }
        voiceService.clearChannel(channel.getId());
        channels.delete(channel);
    }

    @Transactional
    public void createDefaultIfAbsent(ChatScopeType scopeType, UUID scopeId) {
        channels.insertDefaultIfAbsent(UUID.randomUUID(), scopeType.name(), scopeId);
    }

    @Transactional
    public void deleteForScopes(ChatScopeType scopeType, List<UUID> scopeIds) {
        if (scopeIds.isEmpty()) return;
        for (ChatChannelEntity channel : channels.findByScopeTypeAndScopeIdIn(scopeType, scopeIds)) {
            voiceService.clearChannel(channel.getId());
        }
        channels.deleteByScope(scopeType, scopeIds);
    }

    private ChatChannelDto createChannel(
        ChatScopeType scopeType, UUID scopeId, UUID userId, CreateChatChannelRequest request
    ) {
        if (request == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Channel payload is required.");
        }
        ChatChannelType type = ChatChannelValidator.parseChannelType(request.channelType());
        String name = ChatChannelValidator.normalizeName(request.name(), type);
        if (channels.existsByScopeTypeAndScopeIdAndNameIgnoreCase(scopeType, scopeId, name)) {
            throw ApiException.conflict("CHANNEL_EXISTS", "A channel with that name already exists.");
        }
        String description = ChatChannelValidator.normalizeDescription(request.description());
        String category = ChatChannelValidator.normalizeCategory(request.category(), type);
        ChatChannelEntity entity = new ChatChannelEntity(scopeType, scopeId, name, description, type, category, userId);
        return toDto(saveSafely(entity));
    }

    private ChatChannelEntity saveSafely(ChatChannelEntity entity) {
        try {
            return channels.save(entity);
        } catch (DataIntegrityViolationException ex) {
            throw ApiException.conflict("CHANNEL_EXISTS", "A channel with that name already exists.");
        }
    }

    private List<ChatChannelDto> ensureAndList(ChatScopeType scopeType, UUID scopeId, boolean seedVoice) {
        List<ChatChannelEntity> existing = channels.findByScopeTypeAndScopeIdOrderByCreatedAtAsc(scopeType, scopeId);
        boolean seeded = false;
        if (existing.isEmpty()) {
            createDefaultIfAbsent(scopeType, scopeId);
            seeded = true;
        }
        if (seedVoice && !channels.existsByScopeTypeAndScopeIdAndChannelType(scopeType, scopeId, ChatChannelType.VOICE)) {
            channels.insertDefaultVoiceIfAbsent(UUID.randomUUID(), scopeType.name(), scopeId);
            seeded = true;
        }
        if (seeded) {
            existing = channels.findByScopeTypeAndScopeIdOrderByCreatedAtAsc(scopeType, scopeId);
        }
        return existing.stream().map(this::toDto).toList();
    }

    private ChatChannelDto toDto(ChatChannelEntity c) {
        return new ChatChannelDto(
            c.getId(), c.getScopeType().name(), c.getScopeId(), c.getName(), c.getDescription(),
            c.getChannelType().name(), c.getCategory(), voiceService.participantCount(c.getId()), c.getCreatedAt()
        );
    }
}
