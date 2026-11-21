package com.orbit.chat.service;

import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatScopeType;
import com.orbit.chat.repository.ChatChannelRepository;
import com.orbit.common.ApiException;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Resolves a channel to its scope and enforces module gating plus chat permission keys. */
@Component
public class ChatAccessGuard {

    public static final String CHAT_MODULE = "chat";

    private final ChatChannelRepository channels;
    private final ProjectRepository projects;
    private final ProjectModuleRepository projectModules;
    private final WorkspaceModuleService workspaceModules;
    private final WorkspacePermissionEvaluator evaluator;

    public ChatAccessGuard(
        ChatChannelRepository channels,
        ProjectRepository projects,
        ProjectModuleRepository projectModules,
        WorkspaceModuleService workspaceModules,
        WorkspacePermissionEvaluator evaluator
    ) {
        this.channels = channels;
        this.projects = projects;
        this.projectModules = projectModules;
        this.workspaceModules = workspaceModules;
        this.evaluator = evaluator;
    }

    public ChatChannelEntity requireAccess(UUID userId, UUID channelId, boolean write) {
        ChatChannelEntity channel = findChannel(channelId);
        requireChannelPermission(
            userId,
            channel,
            write ? Permissions.CHAT_WRITE : Permissions.CHAT_READ,
            write ? Permissions.PCHAT_WRITE : Permissions.PCHAT_READ
        );
        return channel;
    }

    public ChatChannelEntity requireManageAccess(UUID userId, UUID channelId) {
        ChatChannelEntity channel = findChannel(channelId);
        requireChannelPermission(userId, channel, Permissions.CHAT_MANAGE, Permissions.PCHAT_MANAGE);
        return channel;
    }

    /** Non-throwing variant used for STOMP SUBSCRIBE decisions. */
    public boolean canRead(UUID userId, UUID channelId) {
        try {
            requireAccess(userId, channelId, false);
            return true;
        } catch (ApiException ex) {
            return false;
        }
    }

    /** Non-throwing check used for moderation actions such as deleting another user's message. */
    public boolean canManage(UUID userId, ChatChannelEntity channel) {
        try {
            requireChannelPermission(userId, channel, Permissions.CHAT_MANAGE, Permissions.PCHAT_MANAGE);
            return true;
        } catch (ApiException ex) {
            return false;
        }
    }

    public void requireWorkspaceChat(UUID userId, UUID workspaceId, String permissionKey) {
        evaluator.requireWorkspacePermission(userId, workspaceId, permissionKey);
        if (!workspaceModules.enabledKeys(workspaceId).contains(CHAT_MODULE)) {
            throw moduleDisabled();
        }
    }

    public void requireProjectChat(UUID userId, UUID workspaceId, UUID projectId, String permissionKey) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, permissionKey);
        boolean enabled = projectModules.findEffectiveEnabled(List.of(projectId)).stream()
            .map(KeyValue::value)
            .anyMatch(CHAT_MODULE::equals);
        if (!enabled) {
            throw moduleDisabled();
        }
    }

    private ChatChannelEntity findChannel(UUID channelId) {
        return channels.findById(channelId)
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Channel not found."));
    }

    private void requireChannelPermission(
        UUID userId, ChatChannelEntity channel, String workspacePermission, String projectPermission
    ) {
        if (channel.getScopeType() == ChatScopeType.WORKSPACE) {
            requireWorkspaceChat(userId, channel.getScopeId(), workspacePermission);
            return;
        }
        ProjectEntity project = projects.findById(channel.getScopeId())
            .filter(p -> p.getDeletedAt() == null)
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Channel not found."));
        requireProjectChat(userId, project.getWorkspaceId(), project.getId(), projectPermission);
    }

    private static ApiException moduleDisabled() {
        return ApiException.forbidden("MODULE_DISABLED", "The chat module is disabled here.");
    }
}
