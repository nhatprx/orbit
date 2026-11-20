package com.orbit.chat.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.chat.dto.ChatChannelDto;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.SendChatMessageRequest;
import com.orbit.chat.service.ChatChannelService;
import com.orbit.chat.service.ChatMessageService;
import com.orbit.common.CursorPageResponse;
import com.orbit.common.PageParams;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ChatController {

    private final ChatChannelService channels;
    private final ChatMessageService messages;

    public ChatController(ChatChannelService channels, ChatMessageService messages) {
        this.channels = channels;
        this.messages = messages;
    }

    @GetMapping("/workspaces/{workspaceId}/chat/channels")
    public List<ChatChannelDto> workspaceChannels(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @PathVariable UUID workspaceId
    ) {
        return channels.listWorkspace(principal.userId(), workspaceId);
    }

    @GetMapping("/workspaces/{workspaceId}/projects/{projectId}/chat/channels")
    public List<ChatChannelDto> projectChannels(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId
    ) {
        return channels.listProject(principal.userId(), workspaceId, projectId);
    }

    @GetMapping("/chat/channels/{channelId}/messages")
    public CursorPageResponse<ChatMessageDto> history(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "" + PageParams.DEFAULT_SIZE) int limit
    ) {
        return messages.history(principal.userId(), channelId, cursor, limit);
    }

    @PostMapping("/chat/channels/{channelId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageDto send(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @Valid @RequestBody SendChatMessageRequest request
    ) {
        return messages.send(principal.userId(), channelId, request.content());
    }
}
