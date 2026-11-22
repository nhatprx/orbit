package com.orbit.chat.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.chat.dto.ChatChannelDto;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.ChatReactionEvent;
import com.orbit.chat.dto.CreateChatChannelRequest;
import com.orbit.chat.dto.SendChatMessageRequest;
import com.orbit.chat.dto.UpdateChatChannelRequest;
import com.orbit.chat.service.ChatChannelService;
import com.orbit.chat.service.ChatMessageService;
import com.orbit.chat.service.ChatReactionService;
import com.orbit.common.CursorPageResponse;
import com.orbit.common.PageParams;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
    private final ChatReactionService reactions;

    public ChatController(ChatChannelService channels, ChatMessageService messages, ChatReactionService reactions) {
        this.channels = channels;
        this.messages = messages;
        this.reactions = reactions;
    }

    @GetMapping("/workspaces/{workspaceId}/chat/channels")
    public List<ChatChannelDto> workspaceChannels(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @RequestParam(defaultValue = "false") boolean seedVoice
    ) {
        return channels.listWorkspace(principal.userId(), workspaceId, seedVoice);
    }

    @GetMapping("/workspaces/{workspaceId}/projects/{projectId}/chat/channels")
    public List<ChatChannelDto> projectChannels(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @RequestParam(defaultValue = "false") boolean seedVoice
    ) {
        return channels.listProject(principal.userId(), workspaceId, projectId, seedVoice);
    }

    @PostMapping("/workspaces/{workspaceId}/chat/channels")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatChannelDto createWorkspaceChannel(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @RequestBody CreateChatChannelRequest request
    ) {
        return channels.createWorkspaceChannel(principal.userId(), workspaceId, request);
    }

    @PostMapping("/workspaces/{workspaceId}/projects/{projectId}/chat/channels")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatChannelDto createProjectChannel(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @RequestBody CreateChatChannelRequest request
    ) {
        return channels.createProjectChannel(principal.userId(), workspaceId, projectId, request);
    }

    @PatchMapping("/chat/channels/{channelId}")
    public ChatChannelDto updateChannel(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @RequestBody UpdateChatChannelRequest request
    ) {
        return channels.updateChannel(principal.userId(), channelId, request);
    }

    @DeleteMapping("/chat/channels/{channelId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChannel(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId
    ) {
        channels.deleteChannel(principal.userId(), channelId);
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
        return messages.send(principal.userId(), channelId, request);
    }

    @DeleteMapping("/chat/channels/{channelId}/messages/{messageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMessage(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @PathVariable UUID messageId
    ) {
        messages.deleteMessage(principal.userId(), channelId, messageId);
    }

    @PutMapping("/chat/channels/{channelId}/messages/{messageId}/reactions/{reactionKey}")
    public ChatReactionEvent addReaction(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @PathVariable UUID messageId,
        @PathVariable String reactionKey
    ) {
        return reactions.set(principal.userId(), channelId, messageId, reactionKey, true);
    }

    @DeleteMapping("/chat/channels/{channelId}/messages/{messageId}/reactions/{reactionKey}")
    public ChatReactionEvent removeReaction(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @PathVariable UUID messageId,
        @PathVariable String reactionKey
    ) {
        return reactions.set(principal.userId(), channelId, messageId, reactionKey, false);
    }
}
