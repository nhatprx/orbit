package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatChannelType;
import com.orbit.chat.entity.ChatScopeType;
import com.orbit.chat.service.ChatMentionNotificationService;
import com.orbit.notifications.entity.NotificationEntity;
import com.orbit.notifications.repository.NotificationRepository;
import com.orbit.project.repository.ProjectRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ChatMentionNotificationServiceTest {

    @Test
    void notifiesTaggedMembersAndAllScopeMembers() {
        UserRepository users = mock(UserRepository.class);
        NotificationRepository notifications = mock(NotificationRepository.class);
        ProjectRepository projects = mock(ProjectRepository.class);
        ChatMentionNotificationService service = new ChatMentionNotificationService(users, notifications, projects);

        UUID wsId = UUID.randomUUID();
        UUID senderId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();

        UserEntity sender = new UserEntity();
        sender.setId(senderId);
        sender.setUsername("nhatprx");
        sender.setDisplayName("Minh Nhat");

        UserEntity target = new UserEntity();
        target.setId(targetId);
        target.setUsername("duynn");
        target.setDisplayName("Duy Nguyen");

        ChatChannelEntity channel = new ChatChannelEntity(
            ChatScopeType.WORKSPACE, wsId, "general", "", ChatChannelType.TEXT, null, senderId
        );

        when(users.findWorkspaceMentionRecipients(eq(List.of("duynn")), eq(wsId), eq(senderId)))
            .thenReturn(List.of(target));

        service.notifyMentions(channel, sender, "Hey @duynn please check PR");

        ArgumentCaptor<NotificationEntity> captor = ArgumentCaptor.forClass(NotificationEntity.class);
        verify(notifications).save(captor.capture());
        NotificationEntity saved = captor.getValue();
        assertEquals(targetId, saved.getRecipientId());
        assertEquals("CHAT_MENTION", saved.getType());
        assertEquals("You were mentioned in #general", saved.getTitle());
        assertTrue(saved.getMessage().contains("Hey @duynn"));

        when(users.findAllScopeMembersExcept(wsId, null, senderId)).thenReturn(List.of(target));
        service.notifyMentions(channel, sender, "@all standup now");
        verify(notifications, times(2)).save(any(NotificationEntity.class));
    }
}
