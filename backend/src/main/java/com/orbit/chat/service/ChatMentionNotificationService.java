package com.orbit.chat.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatScopeType;
import com.orbit.notifications.entity.NotificationEntity;
import com.orbit.notifications.repository.NotificationRepository;
import com.orbit.notifications.service.NotificationBroadcaster;
import com.orbit.project.repository.ProjectRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creates in-app notifications when a chat message tags @all or specific @username members. */
@Service
public class ChatMentionNotificationService {

    private static final Pattern MENTION = Pattern.compile("(?<![\\w.])@([A-Za-z0-9_.-]{1,64})");
    private static final int MAX_MENTIONS = 20;

    private final UserRepository users;
    private final NotificationRepository notifications;
    private final ProjectRepository projects;
    private NotificationBroadcaster broadcaster;

    @Autowired
    public ChatMentionNotificationService(
        UserRepository users,
        NotificationRepository notifications,
        ProjectRepository projects
    ) {
        this.users = users;
        this.notifications = notifications;
        this.projects = projects;
    }

    @Autowired(required = false)
    void setBroadcaster(NotificationBroadcaster broadcaster) {
        this.broadcaster = broadcaster;
    }

    @Transactional
    public void notifyMentions(ChatChannelEntity channel, UserEntity sender, String content) {
        if (channel == null || sender == null || content == null || content.isBlank()) return;
        List<String> handles = extractHandles(content);
        if (handles.isEmpty()) return;

        UUID projectId = channel.getScopeType() == ChatScopeType.PROJECT ? channel.getScopeId() : null;
        UUID workspaceId = resolveWorkspaceId(channel, projectId);
        if (workspaceId == null) return;

        boolean mentionsAll = handles.contains("all");
        List<UserEntity> recipients;
        if (mentionsAll) {
            recipients = users.findAllScopeMembersExcept(workspaceId, projectId, sender.getId());
        } else if (projectId != null) {
            recipients = users.findIssueMentionRecipients(handles, projectId, workspaceId, sender.getId());
        } else {
            recipients = users.findWorkspaceMentionRecipients(handles, workspaceId, sender.getId());
        }

        String tagKey = ("#" + channel.getName());
        if (tagKey.length() > 32) tagKey = tagKey.substring(0, 32);
        String title = mentionsAll
            ? "@all mentioned in #" + channel.getName()
            : "You were mentioned in #" + channel.getName();
        if (title.length() > 200) title = title.substring(0, 200);
        String rawBody = sender.getDisplayName() + ": " + content.replaceAll("\\s+", " ").trim();
        String body = rawBody.length() > 500 ? rawBody.substring(0, 500) : rawBody;

        for (UserEntity recipient : recipients) {
            NotificationEntity item = new NotificationEntity();
            item.setRecipientId(recipient.getId());
            item.setActorId(sender.getId());
            item.setWorkspaceId(workspaceId);
            item.setProjectId(projectId);
            item.setIssueKey(tagKey);
            item.setType("CHAT_MENTION");
            item.setTitle(title);
            item.setMessage(body);
            NotificationEntity saved = notifications.save(item);
            if (broadcaster != null) {
                broadcaster.publish(saved, sender.getDisplayName());
            }
        }
    }

    private UUID resolveWorkspaceId(ChatChannelEntity channel, UUID projectId) {
        if (channel.getScopeType() == ChatScopeType.WORKSPACE) {
            return channel.getScopeId();
        }
        return projectId == null ? null : projects.findById(projectId).map(p -> p.getWorkspaceId()).orElse(null);
    }

    static List<String> extractHandles(String text) {
        Matcher matcher = MENTION.matcher(text);
        LinkedHashSet<String> handles = new LinkedHashSet<>();
        while (matcher.find() && handles.size() < MAX_MENTIONS) {
            handles.add(matcher.group(1).toLowerCase(Locale.ROOT));
        }
        return List.copyOf(handles);
    }
}
