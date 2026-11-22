package com.orbit.notifications;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.notifications.entity.NotificationEntity;
import com.orbit.notifications.repository.NotificationRepository;
import com.orbit.notifications.service.NotificationService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;

class NotificationServiceTest {
    private final UUID actorId = UUID.randomUUID();
    private final UUID recipientId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();
    private NotificationRepository notifications;
    private UserRepository users;
    private NotificationService service;

    @BeforeEach
    void setUp() {
        notifications = mock(NotificationRepository.class);
        users = mock(UserRepository.class);
        service = new NotificationService(notifications, users);
    }

    @Test
    void assignmentCreatesNotificationButNeverNotifiesTheActor() {
        service.issueAssigned(recipientId, actorId, workspaceId, projectId, UUID.randomUUID(), "ORB-4", "Ship alerts");
        service.issueAssigned(actorId, actorId, workspaceId, projectId, UUID.randomUUID(), "ORB-5", "Self-assigned");

        verify(notifications).save(any(NotificationEntity.class));
        verify(notifications, org.mockito.Mockito.times(1)).save(any(NotificationEntity.class));
    }

    @Test
    void mentionsAreDeduplicatedAndLimitedToWorkspaceOrProjectMembers() {
        UserEntity actor = new UserEntity();
        actor.setId(actorId);
        actor.setDisplayName("Alex");
        UserEntity recipient = new UserEntity();
        recipient.setId(recipientId);
        when(users.findById(actorId)).thenReturn(java.util.Optional.of(actor));
        when(users.findIssueMentionRecipients(anyCollection(), any(), any(), any())).thenReturn(List.of(recipient));

        service.issueMentions(actorId, workspaceId, projectId, UUID.randomUUID(), "ORB-6", "Review",
            "@sam please check @Sam and @other");

        verify(users).findIssueMentionRecipients(List.of("sam", "other"), projectId, workspaceId, actorId);
        verify(notifications).save(any(NotificationEntity.class));
    }

    @Test
    void listingReturnsUnreadCountAndMarkReadIsScopedToRecipient() {
        NotificationEntity item = new NotificationEntity();
        item.setActorId(actorId);
        when(notifications.findByRecipientIdOrderByCreatedAtDesc(any(), any()))
            .thenReturn(new PageImpl<>(List.of(item)));
        when(notifications.countByRecipientIdAndReadAtIsNull(recipientId)).thenReturn(1L);
        when(users.findAllById(anyCollection())).thenReturn(List.of());

        assertEquals(1, service.list(recipientId, 0, 20).unreadCount());
        verify(notifications).findByRecipientIdOrderByCreatedAtDesc(any(), any());
        verify(notifications, never()).markAllRead(any(), any());
    }
}
