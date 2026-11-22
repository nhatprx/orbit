package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.entity.ChatMessageEntity;
import com.orbit.chat.repository.ChatMessageRepository;
import com.orbit.chat.service.ChatAccessGuard;
import com.orbit.chat.service.ChatBroadcaster;
import com.orbit.chat.service.ChatMessageMutationService;
import com.orbit.common.ApiException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ChatMessageMutationServiceTest {

    @Test
    void authorCanEditOwnMessageAndNonAuthorIsForbidden() {
        ChatMessageRepository repo = mock(ChatMessageRepository.class);
        UserRepository users = mock(UserRepository.class);
        ChatAccessGuard guard = mock(ChatAccessGuard.class);
        ChatBroadcaster broadcaster = mock(ChatBroadcaster.class);
        ChatMessageMutationService service = new ChatMessageMutationService(repo, users, guard, broadcaster, null, null);

        UUID authorId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        UUID channelId = UUID.randomUUID();
        UUID msgId = UUID.randomUUID();
        ChatMessageEntity entity = new ChatMessageEntity(channelId, authorId, "old text");
        when(repo.findByIdAndChannelId(msgId, channelId)).thenReturn(Optional.of(entity));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        UserEntity author = new UserEntity();
        author.setId(authorId);
        author.setDisplayName("Alice");
        author.setUsername("alice");
        when(users.findById(authorId)).thenReturn(Optional.of(author));

        ChatMessageDto edited = service.editMessage(authorId, channelId, msgId, "updated text");
        assertEquals("updated text", edited.content());
        assertNotNull(edited.editedAt());
        verify(broadcaster).broadcast(edited);

        ApiException forbidden = assertThrows(
            ApiException.class,
            () -> service.editMessage(otherId, channelId, msgId, "hijack")
        );
        assertEquals(HttpStatus.FORBIDDEN, forbidden.getStatus());
    }

    @Test
    void memberWithWriteAccessCanPinAndUnpinMessage() {
        ChatMessageRepository repo = mock(ChatMessageRepository.class);
        UserRepository users = mock(UserRepository.class);
        ChatAccessGuard guard = mock(ChatAccessGuard.class);
        ChatBroadcaster broadcaster = mock(ChatBroadcaster.class);
        ChatMessageMutationService service = new ChatMessageMutationService(repo, users, guard, broadcaster, null, null);

        UUID userId = UUID.randomUUID();
        UUID channelId = UUID.randomUUID();
        UUID msgId = UUID.randomUUID();
        ChatMessageEntity entity = new ChatMessageEntity(channelId, userId, "important notice");
        when(repo.findByIdAndChannelId(msgId, channelId)).thenReturn(Optional.of(entity));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        ChatMessageDto pinned = service.setPinned(userId, channelId, msgId, true);
        assertTrue(pinned.pinned());
        assertNotNull(pinned.pinnedAt());

        ChatMessageDto unpinned = service.setPinned(userId, channelId, msgId, false);
        assertFalse(unpinned.pinned());
        assertNull(unpinned.pinnedAt());
        verify(broadcaster, times(2)).broadcast(any());
    }
}
