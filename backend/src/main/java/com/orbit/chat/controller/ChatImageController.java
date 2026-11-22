package com.orbit.chat.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.chat.dto.ChatImagePresignRequest;
import com.orbit.chat.dto.ChatImagePresignResponse;
import com.orbit.chat.service.ChatImageService;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chat/channels/{channelId}/images")
public class ChatImageController {

    private final ChatImageService imageService;

    public ChatImageController(ChatImageService imageService) {
        this.imageService = imageService;
    }

    @PostMapping("/presign")
    public ChatImagePresignResponse presignUpload(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @RequestBody ChatImagePresignRequest request
    ) {
        return imageService.createUploadUrl(principal.userId(), channelId, request);
    }
}
