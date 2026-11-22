package com.orbit.chat.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.EditChatMessageRequest;
import com.orbit.chat.dto.PinChatMessageRequest;
import com.orbit.chat.service.ChatMessageMutationService;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chat/channels/{channelId}/messages/{messageId}")
public class ChatMessageActionsController {

    private final ChatMessageMutationService mutations;

    public ChatMessageActionsController(ChatMessageMutationService mutations) {
        this.mutations = mutations;
    }

    @PatchMapping
    public ChatMessageDto editMessage(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @PathVariable UUID messageId,
        @RequestBody EditChatMessageRequest request
    ) {
        return mutations.editMessage(principal.userId(), channelId, messageId, request != null ? request.content() : null);
    }

    @PutMapping("/pin")
    public ChatMessageDto setPinned(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @PathVariable UUID messageId,
        @RequestBody PinChatMessageRequest request
    ) {
        return mutations.setPinned(principal.userId(), channelId, messageId, request != null && request.pinned());
    }
}
