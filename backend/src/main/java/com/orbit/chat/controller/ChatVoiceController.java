package com.orbit.chat.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.chat.dto.VoiceIceServerDto;
import com.orbit.chat.dto.VoiceParticipantDto;
import com.orbit.chat.dto.VoiceSignalRequest;
import com.orbit.chat.dto.VoiceStateRequest;
import com.orbit.chat.service.ChatVoiceService;
import com.orbit.chat.service.VoiceIceServerService;
import com.orbit.common.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatVoiceController {

    private final ChatVoiceService voice;
    private final VoiceIceServerService iceServers;

    public ChatVoiceController(ChatVoiceService voice, VoiceIceServerService iceServers) {
        this.voice = voice;
        this.iceServers = iceServers;
    }

    @GetMapping("/voice/ice-servers")
    public List<VoiceIceServerDto> iceServers(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        }
        return iceServers.getIceServers();
    }

    @GetMapping("/channels/{channelId}/voice/participants")
    public List<VoiceParticipantDto> participants(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId
    ) {
        return voice.listParticipants(principal.userId(), channelId);
    }

    @PostMapping("/channels/{channelId}/voice/join")
    public List<VoiceParticipantDto> join(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @RequestBody(required = false) VoiceStateRequest request
    ) {
        return voice.join(principal.userId(), channelId, request);
    }

    @PutMapping("/channels/{channelId}/voice/state")
    public List<VoiceParticipantDto> updateState(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @RequestBody VoiceStateRequest request
    ) {
        return voice.updateState(principal.userId(), channelId, request);
    }

    @PostMapping("/channels/{channelId}/voice/leave")
    public List<VoiceParticipantDto> leave(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId
    ) {
        return voice.leave(principal.userId(), channelId);
    }

    @PostMapping("/channels/{channelId}/voice/signal")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void signal(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @RequestBody VoiceSignalRequest request
    ) {
        voice.relaySignal(principal.userId(), channelId, request);
    }
}
