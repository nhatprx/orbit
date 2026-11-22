package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.dto.ChatMessageDeletedDto;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.SendChatMessageRequest;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatChannelType;
import com.orbit.chat.entity.ChatMessageEntity;
import com.orbit.chat.entity.ChatScopeType;
import com.orbit.chat.repository.ChatMessageRepository;
import com.orbit.chat.service.ChatAccessGuard;
import com.orbit.chat.service.ChatBroadcaster;
import com.orbit.chat.service.ChatMessageService;
import com.orbit.common.ApiException;
import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

class ChatMessageServiceTest {

    private ChatMessageRepository messageRepo;
    private UserRepository users;
    private ChatAccessGuard guard;
    private ChatBroadcaster broadcaster;
    private ChatMessageService service;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID channelId = UUID.randomUUID();
    private final UUID voiceChannelId = UUID.randomUUID();
    private final UUID ownerId = UUID.randomUUID();
    private final UUID memberId = UUID.randomUUID();
    private ChatChannelEntity channel;

    @BeforeEach
    void setUp() throws Exception {
        messageRepo = mock(ChatMessageRepository.class);
        users = mock(UserRepository.class);
        guard = mock(ChatAccessGuard.class);
        broadcaster = mock(ChatBroadcaster.class);
        service = new ChatMessageService(messageRepo, users, guard, broadcaster, userId -> { });

        channel = new ChatChannelEntity(ChatScopeType.WORKSPACE, workspaceId, "general", "", ChatChannelType.TEXT, null, ownerId);
        setChannelId(channel, channelId);
        ChatChannelEntity voiceChannel = new ChatChannelEntity(
            ChatScopeType.WORKSPACE, workspaceId, "lounge", "", ChatChannelType.VOICE, null, ownerId
        );
        setChannelId(voiceChannel, voiceChannelId);

        when(guard.requireAccess(any(), eq(channelId), eq(true))).thenReturn(channel);
        when(guard.requireAccess(any(), eq(channelId), eq(false))).thenReturn(channel);
        when(guard.requireAccess(any(), eq(voiceChannelId), eq(true))).thenReturn(voiceChannel);
        when(users.findById(ownerId)).thenReturn(Optional.of(user(ownerId, "owner", "Owner One")));
        when(users.findById(memberId)).thenReturn(Optional.of(user(memberId, "member", "Member Two")));
        when(messageRepo.save(any())).thenAnswer(inv -> {
            ChatMessageEntity msg = inv.getArgument(0);
            setId(msg, UUID.randomUUID());
            return msg;
        });
    }

    @Test
    void sendValidatesReplyTargetAttachmentsAndAllowsVoiceChannelText() throws Exception {
        UUID parentId = UUID.randomUUID();
        ChatMessageEntity parent = new ChatMessageEntity(channelId, ownerId, "a".repeat(250));
        setId(parent, parentId);
        when(messageRepo.findByIdAndChannelId(parentId, channelId)).thenReturn(Optional.of(parent));

        ChatMessageDto sent = service.send(memberId, channelId, new SendChatMessageRequest(
            "replying", parentId, "spec.pdf", "https://example.com/spec.pdf"
        ));
        assertEquals(parentId, sent.replyToId());
        assertEquals("Owner One", sent.replyToSenderName());
        assertEquals(200, sent.replyToSnippet().length());
        assertEquals("spec.pdf", sent.attachmentName());
        assertEquals("https://example.com/spec.pdf", sent.attachmentUrl());
        verify(broadcaster).broadcast(sent);

        ChatMessageDto relative = service.send(memberId, channelId, new SendChatMessageRequest(
            "local file", null, "report.pdf", "/api/v1/files/123"
        ));
        assertEquals("/api/v1/files/123", relative.attachmentUrl());

        // Text messages inside VOICE channels are explicitly permitted.
        ChatMessageDto inVoice = service.send(memberId, voiceChannelId, new SendChatMessageRequest("voice chat msg"));
        assertEquals(voiceChannelId, inVoice.channelId());
        verify(broadcaster).broadcast(inVoice);

        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ApiException.class, () ->
            service.send(memberId, channelId, new SendChatMessageRequest("x", null, "bad", "javascript:alert(1)"))
        ).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ApiException.class, () ->
            service.send(memberId, channelId, new SendChatMessageRequest("x", null, "n".repeat(256), "https://a.test"))
        ).getStatus());
        assertEquals("INVALID_REPLY_TARGET", assertThrows(ApiException.class, () ->
            service.send(memberId, channelId, new SendChatMessageRequest("x", UUID.randomUUID(), null, null))
        ).getCode());
    }

    @Test
    void deleteMessageEnforcesRbacAndBroadcastsDeletionEvent() throws Exception {
        UUID msgId = UUID.randomUUID();
        ChatMessageEntity message = new ChatMessageEntity(channelId, ownerId, "hello");
        setId(message, msgId);
        when(messageRepo.findByIdAndChannelId(msgId, channelId)).thenReturn(Optional.of(message));

        // Non-sender without manage permission is rejected and does NOT broadcast.
        when(guard.canManage(memberId, channel)).thenReturn(false);
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class, () ->
            service.deleteMessage(memberId, channelId, msgId)
        ).getStatus());
        verify(broadcaster, never()).broadcastDeletion(any());

        // Manager can delete another user's message and emits MESSAGE_DELETED event.
        when(guard.canManage(memberId, channel)).thenReturn(true);
        service.deleteMessage(memberId, channelId, msgId);
        verify(messageRepo).save(message);
        assertEquals("", message.getContent());
        org.junit.jupiter.api.Assertions.assertNotNull(message.getDeletedAt());

        // Sender can delete own message even without manage permission.
        when(guard.canManage(ownerId, channel)).thenReturn(false);
        service.deleteMessage(ownerId, channelId, msgId);

        ArgumentCaptor<ChatMessageDeletedDto> captor = ArgumentCaptor.forClass(ChatMessageDeletedDto.class);
        verify(broadcaster, times(2)).broadcastDeletion(captor.capture());
        ChatMessageDeletedDto deletedEvent = captor.getValue();
        assertEquals(ChatMessageDeletedDto.EVENT_TYPE, deletedEvent.eventType());
        assertEquals(channelId, deletedEvent.channelId());
        assertEquals(msgId, deletedEvent.messageId());

        // Missing or cross-channel message returns 404 without broadcasting.
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ApiException.class, () ->
            service.deleteMessage(ownerId, channelId, UUID.randomUUID())
        ).getStatus());
        verify(broadcaster, times(2)).broadcastDeletion(any());
    }

    private static void setId(ChatMessageEntity entity, UUID id) throws Exception {
        Field field = ChatMessageEntity.class.getDeclaredField("id");
        field.setAccessible(true);
        field.set(entity, id);
    }

    private static void setChannelId(ChatChannelEntity entity, UUID id) throws Exception {
        Field field = ChatChannelEntity.class.getDeclaredField("id");
        field.setAccessible(true);
        field.set(entity, id);
    }

    private static UserEntity user(UUID id, String username, String displayName) {
        UserEntity entity = new UserEntity();
        entity.setId(id);
        entity.setUsername(username);
        entity.setDisplayName(displayName);
        return entity;
    }
}
