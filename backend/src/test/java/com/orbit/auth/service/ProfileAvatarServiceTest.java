package com.orbit.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.dto.AuthUserDto;
import com.orbit.auth.dto.AvatarPresignRequest;
import com.orbit.auth.dto.AvatarPresignResponse;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import com.orbit.storage.dto.PresignedUrlResponse;
import com.orbit.storage.service.StorageService;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

class ProfileAvatarServiceTest {

    private UserRepository userRepository;
    private StorageService storageService;
    private ProfileAvatarService service;
    private UUID userId;
    private UserEntity user;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        storageService = mock(StorageService.class);
        service = new ProfileAvatarService(userRepository, storageService);

        userId = UUID.randomUUID();
        user = new UserEntity();
        user.setId(userId);
        user.setUsername("devuser");
        user.setDisplayName("Dev User");
        user.setEmail("dev@orbit.dev");
        user.setRole("user");
        user.setWorkspaceId("ws_orbit_core");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
    }

    @Test
    void createsPresignedUploadScopedToUserId() {
        Instant expiry = Instant.now().plusSeconds(900);
        when(storageService.createPresignedUploadUrlForKey(anyString(), eq("image/png")))
            .thenAnswer(inv -> new PresignedUrlResponse(inv.getArgument(0), "https://s3.aws/put", "PUT", expiry));

        AvatarPresignResponse res = service.createUploadUrl(
            userId,
            new AvatarPresignRequest("my photo.PNG", "IMAGE/PNG", ProfileAvatarService.MAX_AVATAR_BYTES)
        );

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(storageService).createPresignedUploadUrlForKey(keyCaptor.capture(), eq("image/png"));
        assertTrue(keyCaptor.getValue().startsWith("avatars/" + userId + "/"));
        assertTrue(keyCaptor.getValue().endsWith("-my_photo.PNG"));
        assertEquals("https://s3.aws/put", res.uploadUrl());
        assertEquals("PUT", res.method());
        assertEquals("image/png", res.contentType());
    }

    @Test
    void rejectsUnsupportedContentTypesAndInvalidFileSizes() {
        ApiException svgEx = assertThrows(
            ApiException.class,
            () -> service.createUploadUrl(userId, new AvatarPresignRequest("a.svg", "image/svg+xml", 1024L))
        );
        assertEquals(HttpStatus.BAD_REQUEST, svgEx.getStatus());
        assertEquals("INVALID_AVATAR_TYPE", svgEx.getCode());

        ApiException zeroEx = assertThrows(
            ApiException.class,
            () -> service.createUploadUrl(userId, new AvatarPresignRequest("a.png", "image/png", 0L))
        );
        assertEquals("INVALID_AVATAR_SIZE", zeroEx.getCode());

        ApiException tooLargeEx = assertThrows(
            ApiException.class,
            () -> service.createUploadUrl(
                userId,
                new AvatarPresignRequest("a.png", "image/png", ProfileAvatarService.MAX_AVATAR_BYTES + 1)
            )
        );
        assertEquals("INVALID_AVATAR_SIZE", tooLargeEx.getCode());
    }

    @Test
    void confirmsOwnedAvatarKeyAndDeletesPreviousObject() {
        String oldKey = "avatars/" + userId + "/old.png";
        String newKey = "avatars/" + userId + "/new.png";
        user.setAvatarKey(oldKey);
        when(storageService.resolveObjectUrl(newKey)).thenReturn("https://cdn.orbit.dev/" + newKey);

        AuthUserDto updated = service.confirmAvatar(userId, newKey);

        assertEquals(newKey, user.getAvatarKey());
        assertEquals("https://cdn.orbit.dev/" + newKey, updated.avatarUrl());
        verify(storageService).deleteObject(oldKey);
    }

    @Test
    void rejectsAvatarKeyBelongingToAnotherUserOrTraversal() {
        UUID otherUser = UUID.randomUUID();
        ApiException foreignEx = assertThrows(
            ApiException.class,
            () -> service.confirmAvatar(userId, "avatars/" + otherUser + "/pic.png")
        );
        assertEquals(HttpStatus.BAD_REQUEST, foreignEx.getStatus());
        assertEquals("INVALID_AVATAR_KEY", foreignEx.getCode());

        ApiException traversalEx = assertThrows(
            ApiException.class,
            () -> service.confirmAvatar(userId, "avatars/" + userId + "/../other/pic.png")
        );
        assertEquals("INVALID_AVATAR_KEY", traversalEx.getCode());
    }

    @Test
    void removesAvatarAndIsIdempotentWhenAlreadyEmpty() {
        String existingKey = "avatars/" + userId + "/avatar.webp";
        user.setAvatarKey(existingKey);

        AuthUserDto afterRemove = service.removeAvatar(userId);
        assertNull(user.getAvatarKey());
        assertNull(afterRemove.avatarUrl());
        verify(storageService).deleteObject(existingKey);

        AuthUserDto secondRemove = service.removeAvatar(userId);
        assertNull(secondRemove.avatarUrl());
        verify(userRepository).save(user);
        verify(storageService, never()).deleteObject(null);
    }
}
