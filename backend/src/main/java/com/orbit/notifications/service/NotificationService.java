package com.orbit.notifications.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import com.orbit.common.Timestamps;
import com.orbit.notifications.dto.NotificationDto;
import com.orbit.notifications.dto.NotificationInboxResponse;
import com.orbit.notifications.entity.NotificationEntity;
import com.orbit.notifications.repository.NotificationRepository;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private static final Pattern MENTION = Pattern.compile("(?<![\\w.])@([A-Za-z0-9_.-]{1,64})");
    private static final int MAX_MENTIONS = 10;
    private final NotificationRepository notifications;
    private final UserRepository users;

    public NotificationService(NotificationRepository notifications, UserRepository users) {
        this.notifications = notifications;
        this.users = users;
    }

    @Transactional
    public void issueAssigned(UUID recipientId, UUID actorId, UUID workspaceId, UUID projectId,
        UUID issueId, String issueKey, String issueTitle) {
        if (recipientId == null || recipientId.equals(actorId)) return;
        create(recipientId, actorId, workspaceId, projectId, issueId, issueKey,
            "ISSUE_ASSIGNED", "Issue assigned to you", issueKey + " · " + issueTitle);
    }

    @Transactional
    public void issueMentions(UUID actorId, UUID workspaceId, UUID projectId, UUID issueId,
        String issueKey, String issueTitle, String comment) {
        List<String> handles = mentionHandles(comment);
        if (handles.isEmpty()) return;
        List<UserEntity> recipients = users.findIssueMentionRecipients(handles, projectId, workspaceId, actorId);
        UserEntity actor = users.findById(actorId).orElse(null);
        String actorName = actor == null ? "A teammate" : actor.getDisplayName();
        for (UserEntity recipient : recipients) create(
            recipient.getId(), actorId, workspaceId, projectId, issueId, issueKey,
            "ISSUE_MENTION", "You were mentioned", actorName + " mentioned you in " + issueKey + " · " + issueTitle
        );
    }

    @Transactional(readOnly = true)
    public NotificationInboxResponse list(UUID recipientId, int page, int size) {
        Page<NotificationEntity> result = notifications.findByRecipientIdOrderByCreatedAtDesc(
            recipientId, PageParams.of(page, size, Sort.unsorted())
        );
        Map<UUID, String> names = resolveActorNames(result.getContent());
        List<NotificationDto> items = result.getContent().stream().map(n -> new NotificationDto(
            n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.getActorId(),
            names.get(n.getActorId()), n.getWorkspaceId(), n.getProjectId(), n.getIssueId(), n.getIssueKey(),
            n.getCreatedAt(), n.getReadAt()
        )).toList();
        return new NotificationInboxResponse(PageResponse.from(result, items),
            notifications.countByRecipientIdAndReadAtIsNull(recipientId));
    }

    @Transactional
    public void markRead(UUID recipientId, UUID notificationId) {
        NotificationEntity item = notifications.findByIdAndRecipientId(notificationId, recipientId)
            .orElseThrow(() -> ApiException.notFound("NOTIFICATION_NOT_FOUND", "Notification not found."));
        if (item.getReadAt() == null) {
            item.setReadAt(Timestamps.now());
            notifications.save(item);
        }
    }

    @Transactional
    public int markAllRead(UUID recipientId) {
        return notifications.markAllRead(recipientId, Timestamps.now());
    }

    private void create(UUID recipientId, UUID actorId, UUID workspaceId, UUID projectId,
        UUID issueId, String issueKey, String type, String title, String message) {
        NotificationEntity item = new NotificationEntity();
        item.setRecipientId(recipientId);
        item.setActorId(actorId);
        item.setWorkspaceId(workspaceId);
        item.setProjectId(projectId);
        item.setIssueId(issueId);
        item.setIssueKey(issueKey);
        item.setType(type);
        item.setTitle(title);
        item.setMessage(message.length() > 500 ? message.substring(0, 500) : message);
        notifications.save(item);
    }

    private Map<UUID, String> resolveActorNames(Collection<NotificationEntity> items) {
        var ids = items.stream().map(NotificationEntity::getActorId).filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> names = new HashMap<>();
        users.findAllById(ids).forEach(user -> names.put(user.getId(), user.getDisplayName()));
        return names;
    }

    private static List<String> mentionHandles(String text) {
        var matcher = MENTION.matcher(text);
        var handles = new java.util.LinkedHashSet<String>();
        while (matcher.find() && handles.size() < MAX_MENTIONS) handles.add(matcher.group(1).toLowerCase(java.util.Locale.ROOT));
        return List.copyOf(handles);
    }
}
