package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.orbit.chat.dto.ChatImagePresignRequest;
import com.orbit.chat.dto.ChatImagePresignResponse;
import com.orbit.chat.service.ChatAccessGuard;
import com.orbit.chat.service.ChatImageService;
import com.orbit.common.ApiException;
import com.orbit.storage.dto.PresignedUrlResponse;
import com.orbit.storage.service.StorageService;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ChatImageServiceTest {

    @Test
    void presignsValidImageAndResolvesStoredAttachmentKey() {
        ChatAccessGuard guard = mock(ChatAccessGuard.class);
        StorageService storage = mock(StorageService.class);
        ChatImageService service = new ChatImageService(guard, storage);

        UUID userId = UUID.randomUUID();
        UUID channelId = UUID.randomUUID();
        String expectedKey = "uploads/chat/" + channelId + "/abc-photo.png";
        when(storage.createPresignedUploadUrlForKey(anyString(), eq("image/png")))
            .thenReturn(new PresignedUrlResponse(expectedKey, "https://s3.example/put", "PUT", Instant.now().plusSeconds(600)));
        when(storage.resolveObjectUrl(expectedKey)).thenReturn("https://s3.example/get/photo.png");

        ChatImagePresignResponse res = service.createUploadUrl(
            userId, channelId, new ChatImagePresignRequest("photo.png", "image/png", 2048L)
        );

        verify(guard).requireAccess(userId, channelId, true);
        assertEquals(expectedKey, res.key());
        assertEquals("https://s3.example/put", res.uploadUrl());
        assertEquals(ChatImageService.ATTACHMENT_PREFIX + expectedKey, res.attachmentUrl());
        assertEquals("https://s3.example/get/photo.png", ChatImageService.resolveAttachmentUrl(storage, res.attachmentUrl()));
        assertEquals("https://other.example/doc.pdf", ChatImageService.resolveAttachmentUrl(storage, "https://other.example/doc.pdf"));
    }

    @Test
    void rejectsUnsupportedImageTypeAndOversizedImage() {
        ChatAccessGuard guard = mock(ChatAccessGuard.class);
        StorageService storage = mock(StorageService.class);
        ChatImageService service = new ChatImageService(guard, storage);
        UUID userId = UUID.randomUUID();
        UUID channelId = UUID.randomUUID();

        ApiException badType = assertThrows(
            ApiException.class,
            () -> service.createUploadUrl(userId, channelId, new ChatImagePresignRequest("shell.svg", "image/svg+xml", 100L))
        );
        assertEquals(HttpStatus.BAD_REQUEST, badType.getStatus());
        assertEquals("INVALID_IMAGE_TYPE", badType.getCode());

        ApiException tooLarge = assertThrows(
            ApiException.class,
            () -> service.createUploadUrl(userId, channelId, new ChatImagePresignRequest("huge.png", "image/png", ChatImageService.MAX_IMAGE_BYTES + 1))
        );
        assertEquals(HttpStatus.BAD_REQUEST, tooLarge.getStatus());
        assertEquals("INVALID_IMAGE_SIZE", tooLarge.getCode());
    }
}
