package com.orbit.chat.dto;

public record UpdateChatChannelRequest(
    String name,
    String description,
    String category
) {}
