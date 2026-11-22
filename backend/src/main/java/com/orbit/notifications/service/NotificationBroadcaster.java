package com.orbit.notifications.service;

import com.orbit.notifications.dto.NotificationDto;
import com.orbit.notifications.entity.NotificationEntity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/** Pushes newly created in-app notifications over STOMP to /topic/notifications.{userId}. */
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class NotificationBroadcaster {

    public static final String TOPIC_PREFIX = "/topic/notifications.";

    private final SimpMessagingTemplate template;

    public NotificationBroadcaster(@Lazy SimpMessagingTemplate template) {
        this.template = template;
    }

    public void publish(NotificationEntity saved, String actorName) {
        if (saved == null || saved.getRecipientId() == null) return;
        NotificationDto dto = new NotificationDto(
            saved.getId(),
            saved.getType(),
            saved.getTitle(),
            saved.getMessage(),
            saved.getActorId(),
            actorName,
            saved.getWorkspaceId(),
            saved.getProjectId(),
            saved.getIssueId(),
            saved.getIssueKey(),
            saved.getCreatedAt(),
            saved.getReadAt()
        );
        template.convertAndSend(TOPIC_PREFIX + saved.getRecipientId(), dto);
    }
}
