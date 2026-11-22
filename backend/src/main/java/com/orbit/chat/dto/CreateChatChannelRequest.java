package com.orbit.chat.dto;

import java.util.UUID;

public record CreateChatChannelRequest(
    String name,
    String description,
    String channelType,
    String category,
    UUID parentChannelId
) {
    public CreateChatChannelRequest(String name, String description, String channelType, String category) {
        this(name, description, channelType, category, null);
    }
}
