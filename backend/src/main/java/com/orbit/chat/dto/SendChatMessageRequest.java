package com.orbit.chat.dto;

import jakarta.validation.constraints.NotNull;

/** Content length and blank checks live in the service so REST and STOMP share one rule. */
public record SendChatMessageRequest(@NotNull(message = "Message content is required.") String content) {}
