package com.orbit.chat.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** WebRTC ICE/TURN server entry returned to authenticated voice clients. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record VoiceIceServerDto(
    List<String> urls,
    String username,
    String credential
) {
    public VoiceIceServerDto(List<String> urls) {
        this(urls, null, null);
    }
}
