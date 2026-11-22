package com.orbit.chat.dto;

public record UpdateChatChannelRequest(
    String name,
    String description,
    String category,
    String avatarUrl
) {
    public UpdateChatChannelRequest(String name, String description, String category) {
        this(name, description, category, null);
    }
}
