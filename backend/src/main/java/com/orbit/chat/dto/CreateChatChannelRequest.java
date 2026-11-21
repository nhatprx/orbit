package com.orbit.chat.dto;

public record CreateChatChannelRequest(
    String name,
    String description,
    String channelType,
    String category
) {}
