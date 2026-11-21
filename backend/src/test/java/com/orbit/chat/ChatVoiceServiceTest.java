package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
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
import com.orbit.chat.service.ChatRelay;
import com.orbit.chat.service.ChatVoiceService;
import com.orbit.common.ApiException;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ChatVoiceServiceTest {

    private ChatAccessGuard guard;
    private UserRepository users;
    private ChatRelay relay;
    private ChatVoiceService voice;

    private UUID scopeId;
    private UUID voiceAId;
    private UUID voiceBId;
    private UUID otherScopeVoiceId;
    private UUID textChannelId;
    private UserEntity alice;
    private UserEntity bob;

    @BeforeEach
    void setUp() throws Exception {
        guard = mock(ChatAccessGuard.class);
        users = mock(UserRepository.class);
        relay = mock(ChatRelay.class);
        voice = new ChatVoiceService(guard, users, relay);

        scopeId = UUID.randomUUID();
        voiceAId = UUID.randomUUID();
        voiceBId = UUID.randomUUID();
        otherScopeVoiceId = UUID.randomUUID();
        textChannelId = UUID.randomUUID();

        alice = user(UUID.randomUUID(), "alice", "Alice A");
        bob = user(UUID.randomUUID(), "bob", "Bob B");
        when(users.findById(alice.getId())).thenReturn(Optional.of(alice));
        when(users.findById(bob.getId())).thenReturn(Optional.of(bob));

        ChatChannelEntity voiceA = channel(voiceAId, ChatScopeType.WORKSPACE, scopeId, "lounge", ChatChannelType.VOICE);
        ChatChannelEntity voiceB = channel(voiceBId, ChatScopeType.WORKSPACE, scopeId, "standup", ChatChannelType.VOICE);
        ChatChannelEntity otherVoice = channel(
            otherScopeVoiceId, ChatScopeType.PROJECT, UUID.randomUUID(), "project-room", ChatChannelType.VOICE
        );
        ChatChannelEntity text = channel(textChannelId, ChatScopeType.WORKSPACE, scopeId, "general", ChatChannelType.TEXT);

        for (UUID uid : List.of(alice.getId(), bob.getId())) {
            when(guard.requireAccess(uid, voiceAId, false)).thenReturn(voiceA);
            when(guard.requireAccess(uid, voiceBId, false)).thenReturn(voiceB);
            when(guard.requireAccess(uid, otherScopeVoiceId, false)).thenReturn(otherVoice);
            when(guard.requireAccess(uid, textChannelId, false)).thenReturn(text);
        }
    }

    @Test
    void joinUpdateSwitchRoomLeaveAndClearBroadcastParticipants() {
        List<VoiceParticipantDto> joined = voice.join(alice.getId(), voiceAId, null);
        assertEquals(1, joined.size());
        assertEquals(1, voice.participantCount(voiceAId));
        assertFalse(joined.getFirst().muted());

        // Idempotent re-join preserves joinedAt and forces muted when deafened.
        List<VoiceParticipantDto> rejoined = voice.join(
            alice.getId(), voiceAId, new VoiceStateRequest(false, true, true, false, false)
        );
        assertEquals(1, rejoined.size());
        assertEquals(joined.getFirst().joinedAt(), rejoined.getFirst().joinedAt());
        assertTrue(rejoined.getFirst().deafened());
        assertTrue(rejoined.getFirst().muted());
        assertTrue(rejoined.getFirst().cameraOn());

        // Updating state enforces deafened => muted.
        List<VoiceParticipantDto> updated = voice.updateState(
            alice.getId(), voiceAId, new VoiceStateRequest(false, true, false, true, false)
        );
        assertTrue(updated.getFirst().muted());
        assertTrue(updated.getFirst().screenSharing());

        // Joining a different scope does NOT remove Alice from voiceA.
        voice.join(alice.getId(), otherScopeVoiceId, null);
        assertEquals(1, voice.participantCount(voiceAId));
        assertEquals(1, voice.participantCount(otherScopeVoiceId));

        // Joining voiceB in the SAME scope automatically removes Alice from voiceA.
        voice.join(bob.getId(), voiceAId, null);
        voice.join(alice.getId(), voiceBId, null);
        assertEquals(1, voice.participantCount(voiceAId));
        assertEquals(bob.getId(), voice.listParticipants(bob.getId(), voiceAId).getFirst().userId());
        assertEquals(1, voice.participantCount(voiceBId));

        // Leaving removes participant; second leave is idempotent.
        assertTrue(voice.leave(alice.getId(), voiceBId).isEmpty());
        assertEquals(0, voice.participantCount(voiceBId));
        assertTrue(voice.leave(alice.getId(), voiceBId).isEmpty());

        // Clearing channel empties participants and broadcasts empty list.
        voice.clearChannel(voiceAId);
        assertEquals(0, voice.participantCount(voiceAId));
    }

    @Test
    void signalValidationAndTextChannelRejection() {
        VoiceSignalRequest offer = new VoiceSignalRequest("offer", bob.getId(), "v=0...", null, null, null);
        voice.relaySignal(alice.getId(), voiceAId, offer);

        ArgumentCaptor<VoiceEventDto> captor = ArgumentCaptor.forClass(VoiceEventDto.class);
        verify(relay, times(1)).deliverVoice(captor.capture());
        assertEquals("SIGNAL", captor.getValue().eventType());
        assertEquals("OFFER", captor.getValue().signalType());
        assertEquals(bob.getId(), captor.getValue().targetUserId());

        ApiException badSig = assertThrows(ApiException.class, () ->
            voice.relaySignal(alice.getId(), voiceAId, new VoiceSignalRequest("UNKNOWN", null, null, null, null, null))
        );
        assertEquals("INVALID_SIGNAL", badSig.getCode());

        ApiException notInVoice = assertThrows(ApiException.class, () ->
            voice.updateState(alice.getId(), voiceAId, new VoiceStateRequest(true, false, false, false, false))
        );
        assertEquals("NOT_IN_VOICE", notInVoice.getCode());

        for (Runnable call : List.<Runnable>of(
            () -> voice.listParticipants(alice.getId(), textChannelId),
            () -> voice.join(alice.getId(), textChannelId, null),
            () -> voice.updateState(alice.getId(), textChannelId, new VoiceStateRequest(false, false, false, false, false)),
            () -> voice.leave(alice.getId(), textChannelId),
            () -> voice.relaySignal(alice.getId(), textChannelId, offer)
        )) {
            ApiException ex = assertThrows(ApiException.class, call::run);
            assertEquals("NOT_VOICE_CHANNEL", ex.getCode());
        }
        verify(relay, never()).deliver(any());
    }

    private static UserEntity user(UUID id, String username, String displayName) {
        UserEntity entity = new UserEntity();
        entity.setId(id);
        entity.setUsername(username);
        entity.setDisplayName(displayName);
        return entity;
    }

    private static ChatChannelEntity channel(
        UUID id, ChatScopeType scope, UUID scopeId, String name, ChatChannelType type
    ) throws Exception {
        ChatChannelEntity entity = new ChatChannelEntity(scope, scopeId, name, "", type, null, null);
        Field idField = ChatChannelEntity.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(entity, id);
        return entity;
    }
}
