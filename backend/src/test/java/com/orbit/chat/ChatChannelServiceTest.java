package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.chat.dto.ChatChannelDto;
import com.orbit.chat.dto.CreateChatChannelRequest;
import com.orbit.chat.dto.UpdateChatChannelRequest;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatChannelType;
import com.orbit.chat.entity.ChatScopeType;
import com.orbit.chat.repository.ChatChannelRepository;
import com.orbit.chat.service.ChatAccessGuard;
import com.orbit.chat.service.ChatChannelService;
import com.orbit.chat.service.ChatVoiceService;
import com.orbit.common.ApiException;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ChatChannelServiceTest {

    private ChatChannelRepository channelRepo;
    private ChatAccessGuard guard;
    private ChatVoiceService voice;
    private ChatChannelService service;
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();
    private final UUID ownerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        channelRepo = mock(ChatChannelRepository.class);
        guard = mock(ChatAccessGuard.class);
        voice = mock(ChatVoiceService.class);
        service = new ChatChannelService(channelRepo, guard, voice);
    }

    @Test
    void listSeedsVoiceOnlyWhenRequestedAndPopulatesParticipantCount() throws Exception {
        ChatChannelEntity general = entity(UUID.randomUUID(), "general", ChatChannelType.TEXT);
        ChatChannelEntity lounge = entity(UUID.randomUUID(), "lounge", ChatChannelType.VOICE);
        when(channelRepo.findByScopeTypeAndScopeIdOrderByCreatedAtAsc(ChatScopeType.WORKSPACE, workspaceId))
            .thenReturn(List.of(general))
            .thenReturn(List.of(general))
            .thenReturn(List.of(general, lounge));
        when(channelRepo.existsByScopeTypeAndScopeIdAndChannelType(
            ChatScopeType.WORKSPACE, workspaceId, ChatChannelType.VOICE
        )).thenReturn(false);
        when(voice.participantCount(lounge.getId())).thenReturn(3);

        List<ChatChannelDto> withoutVoice = service.listWorkspace(ownerId, workspaceId, false);
        assertEquals(1, withoutVoice.size());
        verify(channelRepo, never()).insertDefaultVoiceIfAbsent(any(), any(), any());

        List<ChatChannelDto> withVoice = service.listWorkspace(ownerId, workspaceId, true);
        assertEquals(2, withVoice.size());
        assertEquals(3, withVoice.get(1).participantCount());
        verify(channelRepo).insertDefaultVoiceIfAbsent(any(), eq("WORKSPACE"), eq(workspaceId));
    }

    @Test
    void createUpdateAndDeleteEnforceValidationDuplicatesAndDefaultProtection() throws Exception {
        when(channelRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        ChatChannelDto text = service.createWorkspaceChannel(
            ownerId, workspaceId, new CreateChatChannelRequest("  Design_Review ", "Specs", "TEXT", null)
        );
        assertEquals("design-review", text.name());
        assertEquals("TEXT CHANNELS", text.category());
        verify(guard).requireWorkspaceChat(ownerId, workspaceId, Permissions.CHAT_MANAGE);

        ChatChannelDto voiceRoom = service.createProjectChannel(
            ownerId, workspaceId, projectId, new CreateChatChannelRequest("  Daily  Standup ", "", "VOICE", null)
        );
        assertEquals("Daily Standup", voiceRoom.name());
        assertEquals("VOICE CHANNELS", voiceRoom.category());
        verify(guard).requireProjectChat(ownerId, workspaceId, projectId, Permissions.PCHAT_MANAGE);

        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ApiException.class, () ->
            service.createWorkspaceChannel(ownerId, workspaceId, new CreateChatChannelRequest("x", "", "VIDEO", null))
        ).getStatus());

        when(channelRepo.existsByScopeTypeAndScopeIdAndNameIgnoreCase(
            ChatScopeType.WORKSPACE, workspaceId, "design-review"
        )).thenReturn(true);
        assertEquals(HttpStatus.CONFLICT, assertThrows(ApiException.class, () ->
            service.createWorkspaceChannel(ownerId, workspaceId, new CreateChatChannelRequest("Design Review", "", "TEXT", null))
        ).getStatus());

        ChatChannelEntity general = entity(UUID.randomUUID(), "general", ChatChannelType.TEXT);
        when(guard.requireManageAccess(ownerId, general.getId())).thenReturn(general);
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ApiException.class, () ->
            service.updateChannel(ownerId, general.getId(), new UpdateChatChannelRequest("   ", null, null))
        ).getStatus());
        service.deleteChannel(ownerId, general.getId());
        verify(channelRepo).delete(general);

        when(channelRepo.existsByScopeTypeAndScopeIdAndNameIgnoreCaseAndIdNot(
            ChatScopeType.WORKSPACE, workspaceId, "design-review", general.getId()
        )).thenReturn(true);
        assertEquals(HttpStatus.CONFLICT, assertThrows(ApiException.class, () ->
            service.updateChannel(ownerId, general.getId(), new UpdateChatChannelRequest("Design Review", null, null))
        ).getStatus());

        ChatChannelEntity customVoice = entity(UUID.randomUUID(), "standup", ChatChannelType.VOICE);
        when(guard.requireManageAccess(ownerId, customVoice.getId())).thenReturn(customVoice);
        service.deleteChannel(ownerId, customVoice.getId());
        verify(voice).clearChannel(customVoice.getId());
        verify(channelRepo).delete(customVoice);
    }

    @Test
    void accessGuardChecksManagePermissionAndModuleState() throws Exception {
        WorkspaceModuleService wsModules = mock(WorkspaceModuleService.class);
        WorkspacePermissionEvaluator evaluator = mock(WorkspacePermissionEvaluator.class);
        ChatAccessGuard realGuard = new ChatAccessGuard(
            channelRepo, mock(ProjectRepository.class), mock(ProjectModuleRepository.class), wsModules, evaluator
        );
        ChatChannelEntity ch = entity(UUID.randomUUID(), "general", ChatChannelType.TEXT);
        when(channelRepo.findById(ch.getId())).thenReturn(Optional.of(ch));
        when(wsModules.enabledKeys(workspaceId)).thenReturn(Set.of("chat"));

        assertEquals(ch, realGuard.requireManageAccess(ownerId, ch.getId()));
        assertTrue(realGuard.canManage(ownerId, ch));

        doThrow(ApiException.forbidden("FORBIDDEN", "denied"))
            .when(evaluator).requireWorkspacePermission(ownerId, workspaceId, Permissions.CHAT_MANAGE);
        assertFalse(realGuard.canManage(ownerId, ch));
        assertThrows(ApiException.class, () -> realGuard.requireManageAccess(ownerId, ch.getId()));
    }

    private ChatChannelEntity entity(UUID id, String name, ChatChannelType type) throws Exception {
        ChatChannelEntity entity = new ChatChannelEntity(ChatScopeType.WORKSPACE, workspaceId, name, "", type, null, ownerId);
        Field field = ChatChannelEntity.class.getDeclaredField("id");
        field.setAccessible(true);
        field.set(entity, id);
        return entity;
    }
}
