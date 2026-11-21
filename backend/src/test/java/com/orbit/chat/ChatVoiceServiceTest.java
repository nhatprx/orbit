package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.dto.VoiceEventDto;
import com.orbit.chat.dto.VoiceParticipantDto;
import com.orbit.chat.dto.VoiceSignalRequest;
import com.orbit.chat.dto.VoiceStateRequest;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatChannelType;
import com.orbit.chat.entity.ChatScopeType;
import com.orbit.chat.service.ChatAccessGuard;
import com.orbit.chat.service.ChatBroadcaster;
import com.orbit.chat.service.ChatRateLimiter;
import com.orbit.chat.service.ChatVoiceService;
import com.orbit.chat.service.InMemoryVoicePresenceStore;
import com.orbit.common.ApiException;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

class ChatVoiceServiceTest {

    private ChatAccessGuard guard;
    private ChatBroadcaster broadcaster;
    private ChatRateLimiter rateLimiter;
    private ChatVoiceService voice;
    private UUID scopeId, voiceAId, voiceBId, otherScopeVoiceId, textChannelId;
    private UserEntity alice, bob, reader;

    @BeforeEach
    void setUp() throws Exception {
        guard = mock(ChatAccessGuard.class);
        UserRepository users = mock(UserRepository.class);
        broadcaster = mock(ChatBroadcaster.class);
        rateLimiter = mock(ChatRateLimiter.class);
        voice = new ChatVoiceService(guard, users, broadcaster, rateLimiter, new InMemoryVoicePresenceStore());

        scopeId = UUID.randomUUID();
        voiceAId = UUID.randomUUID();
        voiceBId = UUID.randomUUID();
        otherScopeVoiceId = UUID.randomUUID();
        textChannelId = UUID.randomUUID();

        alice = user(UUID.randomUUID(), "alice", "Alice A");
        bob = user(UUID.randomUUID(), "bob", "Bob B");
        reader = user(UUID.randomUUID(), "reader", "Read Only");
        for (UserEntity u : List.of(alice, bob, reader)) when(users.findById(u.getId())).thenReturn(Optional.of(u));

        ChatChannelEntity voiceA = channel(voiceAId, ChatScopeType.WORKSPACE, scopeId, "lounge", ChatChannelType.VOICE);
        ChatChannelEntity voiceB = channel(voiceBId, ChatScopeType.WORKSPACE, scopeId, "standup", ChatChannelType.VOICE);
        ChatChannelEntity other = channel(otherScopeVoiceId, ChatScopeType.PROJECT, UUID.randomUUID(), "room", ChatChannelType.VOICE);
        ChatChannelEntity text = channel(textChannelId, ChatScopeType.WORKSPACE, scopeId, "general", ChatChannelType.TEXT);

        for (UUID uid : List.of(alice.getId(), bob.getId())) {
            for (boolean w : List.of(false, true)) {
                when(guard.requireAccess(uid, voiceAId, w)).thenReturn(voiceA);
                when(guard.requireAccess(uid, voiceBId, w)).thenReturn(voiceB);
                when(guard.requireAccess(uid, otherScopeVoiceId, w)).thenReturn(other);
                when(guard.requireAccess(uid, textChannelId, w)).thenReturn(text);
            }
        }
        when(guard.requireAccess(reader.getId(), voiceAId, false)).thenReturn(voiceA);
        when(guard.requireAccess(reader.getId(), voiceAId, true))
            .thenThrow(ApiException.forbidden("FORBIDDEN", "Write access required."));
    }

    @Test
    void joinUpdateSwitchRoomLeaveClearAndDisconnectBroadcastParticipants() {
        List<VoiceParticipantDto> joined = voice.join(alice.getId(), voiceAId, null);
        assertEquals(1, joined.size());
        assertFalse(joined.getFirst().muted());

        List<VoiceParticipantDto> rejoined = voice.join(alice.getId(), voiceAId, new VoiceStateRequest(false, true, true, false, false));
        assertEquals(joined.getFirst().joinedAt(), rejoined.getFirst().joinedAt());
        assertTrue(rejoined.getFirst().deafened() && rejoined.getFirst().muted() && rejoined.getFirst().cameraOn());

        List<VoiceParticipantDto> updated = voice.updateState(alice.getId(), voiceAId, new VoiceStateRequest(false, true, false, true, false));
        assertTrue(updated.getFirst().muted() && updated.getFirst().screenSharing());

        voice.join(alice.getId(), otherScopeVoiceId, null);
        voice.join(bob.getId(), voiceAId, null);
        voice.join(alice.getId(), voiceBId, null);
        assertEquals(1, voice.participantCount(voiceAId));
        assertEquals(bob.getId(), voice.listParticipants(bob.getId(), voiceAId).getFirst().userId());
        assertEquals(1, voice.participantCount(voiceBId));
        assertEquals(1, voice.participantCount(otherScopeVoiceId));

        assertTrue(voice.leave(alice.getId(), voiceBId).isEmpty());
        assertTrue(voice.leave(alice.getId(), voiceBId).isEmpty());

        voice.leaveAllOnDisconnect(alice.getId(), Set.of());
        assertEquals(0, voice.participantCount(otherScopeVoiceId));

        voice.clearChannel(voiceAId);
        assertEquals(0, voice.participantCount(voiceAId));
    }

    @Test
    void rbacMembershipRateLimitSignalValidationAndTextRejection() {
        VoiceSignalRequest offer = new VoiceSignalRequest("offer", bob.getId(), "v=0...", null, null, null);
        assertTrue(voice.listParticipants(reader.getId(), voiceAId).isEmpty());
        for (Runnable call : List.<Runnable>of(
            () -> voice.join(reader.getId(), voiceAId, null),
            () -> voice.updateState(reader.getId(), voiceAId, new VoiceStateRequest(true, false, false, false, false)),
            () -> voice.relaySignal(reader.getId(), voiceAId, offer)
        )) {
            assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class, call::run).getStatus());
        }

        assertEquals("NOT_IN_VOICE", assertThrows(ApiException.class, () -> voice.relaySignal(alice.getId(), voiceAId, offer)).getCode());
        assertEquals("NOT_IN_VOICE", assertThrows(ApiException.class, () ->
            voice.updateState(alice.getId(), voiceAId, new VoiceStateRequest(true, false, false, false, false))
        ).getCode());

        voice.join(alice.getId(), voiceAId, null);
        voice.relaySignal(alice.getId(), voiceAId, offer);
        verify(rateLimiter, times(1)).check(alice.getId());

        ArgumentCaptor<VoiceEventDto> captor = ArgumentCaptor.forClass(VoiceEventDto.class);
        verify(broadcaster, times(2)).broadcastVoice(captor.capture());
        VoiceEventDto sig = captor.getAllValues().getLast();
        assertEquals("SIGNAL", sig.eventType());
        assertEquals("OFFER", sig.signalType());
        assertEquals(bob.getId(), sig.targetUserId());

        assertEquals("INVALID_SIGNAL", assertThrows(ApiException.class, () ->
            voice.relaySignal(alice.getId(), voiceAId, new VoiceSignalRequest("UNKNOWN", null, null, null, null, null))
        ).getCode());

        doThrow(new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Slow down")).when(rateLimiter).check(alice.getId());
        assertEquals("RATE_LIMITED", assertThrows(ApiException.class, () -> voice.relaySignal(alice.getId(), voiceAId, offer)).getCode());

        for (Runnable call : List.<Runnable>of(
            () -> voice.listParticipants(alice.getId(), textChannelId),
            () -> voice.join(alice.getId(), textChannelId, null),
            () -> voice.updateState(alice.getId(), textChannelId, new VoiceStateRequest(false, false, false, false, false)),
            () -> voice.leave(alice.getId(), textChannelId),
            () -> voice.relaySignal(alice.getId(), textChannelId, offer)
        )) {
            assertEquals("NOT_VOICE_CHANNEL", assertThrows(ApiException.class, call::run).getCode());
        }
        verify(broadcaster, never()).broadcast(any());
    }

    private static UserEntity user(UUID id, String username, String displayName) {
        UserEntity entity = new UserEntity();
        entity.setId(id);
        entity.setUsername(username);
        entity.setDisplayName(displayName);
        return entity;
    }

    private static ChatChannelEntity channel(UUID id, ChatScopeType scope, UUID scopeId, String name, ChatChannelType type) throws Exception {
        ChatChannelEntity entity = new ChatChannelEntity(scope, scopeId, name, "", type, null, null);
        Field idField = ChatChannelEntity.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(entity, id);
        return entity;
    }
}
