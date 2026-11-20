package com.orbit.chat.service;

import com.orbit.chat.entity.ChatScopeType;
import com.orbit.project.event.ProjectCreatedEvent;
import com.orbit.workspace.event.WorkspaceCreatedEvent;
import com.orbit.workspace.event.WorkspacePurgingEvent;
import java.util.List;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/** Seeds the default channel with a new scope and removes polymorphic chat data on purge. */
@Component
class ChatLifecycleListener {

    private final ChatChannelService channels;

    ChatLifecycleListener(ChatChannelService channels) {
        this.channels = channels;
    }

    @EventListener
    void onWorkspaceCreated(WorkspaceCreatedEvent event) {
        if (event.chatEnabled()) {
            channels.createDefaultIfAbsent(ChatScopeType.WORKSPACE, event.workspaceId());
        }
    }

    @EventListener
    void onProjectCreated(ProjectCreatedEvent event) {
        if (event.chatEnabled()) {
            channels.createDefaultIfAbsent(ChatScopeType.PROJECT, event.projectId());
        }
    }

    @EventListener
    void onWorkspacePurging(WorkspacePurgingEvent event) {
        channels.deleteForScopes(ChatScopeType.WORKSPACE, List.of(event.workspaceId()));
        channels.deleteForScopes(ChatScopeType.PROJECT, event.projectIds());
    }
}
