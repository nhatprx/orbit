package com.orbit.chat.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.chat.dto.VoiceParticipantDto;
import com.orbit.chat.dto.VoiceSignalRequest;
import com.orbit.chat.dto.VoiceStateRequest;
import com.orbit.chat.service.ChatVoiceService;
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
@RequestMapping("/api/v1/chat/channels/{channelId}/voice")
public class ChatVoiceController {

    private final ChatVoiceService voice;

    public ChatVoiceController(ChatVoiceService voice) {
        this.voice = voice;
    }

    @GetMapping("/participants")
    public List<VoiceParticipantDto> participants(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId
    ) {
        return voice.listParticipants(principal.userId(), channelId);
    }

    @PostMapping("/join")
    public List<VoiceParticipantDto> join(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @RequestBody(required = false) VoiceStateRequest request
    ) {
        return voice.join(principal.userId(), channelId, request);
    }

    @PutMapping("/state")
    public List<VoiceParticipantDto> updateState(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @RequestBody VoiceStateRequest request
    ) {
        return voice.updateState(principal.userId(), channelId, request);
    }

    @PostMapping("/leave")
    public List<VoiceParticipantDto> leave(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId
    ) {
        return voice.leave(principal.userId(), channelId);
    }

    @PostMapping("/signal")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void signal(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID channelId,
        @RequestBody VoiceSignalRequest request
    ) {
        voice.relaySignal(principal.userId(), channelId, request);
    }
}
