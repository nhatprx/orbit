package com.orbit.ai.tools;

import com.orbit.ai.dto.AiCitationDto;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatScopeType;
import com.orbit.chat.repository.ChatChannelRepository;
import com.orbit.chat.repository.ChatMessageRepository;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.entity.WorkspaceEntity;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.repository.WorkspaceRepository;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

/** RBAC-enforced live tools for inspecting Orbit Workspaces, Projects, and Chat history. */
@Component
public class OrbitWorkspaceTools {

    private final WorkspacePermissionEvaluator evaluator;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceModuleService workspaceModuleService;
    private final ProjectRepository projectRepository;
    private final ChatChannelRepository chatChannelRepository;
    private final ChatMessageRepository chatMessageRepository;

    public OrbitWorkspaceTools(
        WorkspacePermissionEvaluator evaluator,
        WorkspaceRepository workspaceRepository,
        WorkspaceModuleService workspaceModuleService,
        ProjectRepository projectRepository,
        ChatChannelRepository chatChannelRepository,
        ChatMessageRepository chatMessageRepository
    ) {
        this.evaluator = evaluator;
        this.workspaceRepository = workspaceRepository;
        this.workspaceModuleService = workspaceModuleService;
        this.projectRepository = projectRepository;
        this.chatChannelRepository = chatChannelRepository;
        this.chatMessageRepository = chatMessageRepository;
    }

    public AiToolResult getWorkspaceOverview(AiToolContext ctx) {
        if (ctx.workspaceId() == null) {
            return listUserProjects(ctx);
        }
        evaluator.requireWorkspacePermission(ctx.userId(), ctx.workspaceId(), Permissions.WORKSPACE_VIEW);
        WorkspaceEntity ws = workspaceRepository.findByIdAndDeletedAtIsNull(ctx.workspaceId()).orElse(null);
        if (ws == null) return AiToolResult.text("Workspace not found.", "Not found");

        Set<String> modules = workspaceModuleService.enabledKeys(ws.getId());
        List<ProjectEntity> projects = projectRepository.findVisibleAcrossWorkspaces(ctx.userId(), PageRequest.of(0, 20))
            .getContent().stream()
            .filter(p -> p.getWorkspaceId().equals(ws.getId()))
            .toList();

        StringBuilder sb = new StringBuilder();
        sb.append("Workspace: ").append(ws.getName()).append(" (id=").append(ws.getId()).append(")\n");
        if (ws.getDescription() != null) sb.append("Description: ").append(ws.getDescription()).append("\n");
        sb.append("Enabled modules: ").append(String.join(", ", modules)).append("\n");
        sb.append("Visible projects (").append(projects.size()).append("):\n");
        for (ProjectEntity p : projects) {
            sb.append("- ").append(p.getName()).append(" (id=").append(p.getId()).append(")");
            if (p.getDescription() != null) sb.append(": ").append(p.getDescription());
            sb.append("\n");
        }
        return new AiToolResult(
            sb.toString(),
            "Loaded workspace " + ws.getName(),
            List.of(new AiCitationDto("workspace", ws.getName(), ws.getId().toString()))
        );
    }

    public AiToolResult listUserProjects(AiToolContext ctx) {
        List<ProjectEntity> projects = projectRepository.findVisibleAcrossWorkspaces(ctx.userId(), PageRequest.of(0, 25))
            .getContent();
        if (projects.isEmpty()) {
            return AiToolResult.text("No visible projects found for this user.", "0 projects");
        }
        StringBuilder sb = new StringBuilder("Accessible projects:\n");
        List<AiCitationDto> citations = new ArrayList<>();
        for (ProjectEntity p : projects) {
            sb.append("- ").append(p.getName()).append(" (id=").append(p.getId())
                .append(", workspaceId=").append(p.getWorkspaceId()).append(")");
            if (p.getDescription() != null) sb.append(": ").append(p.getDescription());
            sb.append("\n");
            citations.add(new AiCitationDto("project", p.getName(), p.getId().toString()));
        }
        return new AiToolResult(sb.toString(), "Found " + projects.size() + " projects", citations);
    }

    public AiToolResult getRecentChatContext(AiToolContext ctx, int limit) {
        int bounded = Math.max(1, Math.min(limit, 20));
        ChatChannelEntity channel = resolveChannel(ctx);
        if (channel == null) {
            return AiToolResult.text("No accessible chat channel in the current scope.", "No chat channel");
        }
        List<ChatMessageDto> recent = chatMessageRepository.findLatest(channel.getId(), PageRequest.of(0, bounded));
        if (recent.isEmpty()) {
            return AiToolResult.text("No recent messages in #" + channel.getName() + ".", "Empty channel");
        }
        StringBuilder sb = new StringBuilder("Recent messages in #").append(channel.getName()).append(":\n");
        for (int i = recent.size() - 1; i >= 0; i--) {
            ChatMessageDto msg = recent.get(i);
            sb.append("[").append(msg.createdAt()).append("] ").append(msg.senderName())
                .append(": ").append(msg.content()).append("\n");
        }
        return new AiToolResult(
            sb.toString(),
            "Read " + recent.size() + " chat messages",
            List.of(new AiCitationDto("chat", "#" + channel.getName(), channel.getId().toString()))
        );
    }

    private ChatChannelEntity resolveChannel(AiToolContext ctx) {
        if (ctx.projectId() != null && ctx.workspaceId() != null) {
            evaluator.requireProjectPermission(ctx.userId(), ctx.workspaceId(), ctx.projectId(), Permissions.PCHAT_READ);
            return chatChannelRepository
                .findByScopeTypeAndScopeIdOrderByCreatedAtAsc(ChatScopeType.PROJECT, ctx.projectId())
                .stream().findFirst().orElse(null);
        }
        if (ctx.workspaceId() != null) {
            evaluator.requireWorkspacePermission(ctx.userId(), ctx.workspaceId(), Permissions.CHAT_READ);
            return chatChannelRepository
                .findByScopeTypeAndScopeIdOrderByCreatedAtAsc(ChatScopeType.WORKSPACE, ctx.workspaceId())
                .stream().findFirst().orElse(null);
        }
        return null;
    }
}
