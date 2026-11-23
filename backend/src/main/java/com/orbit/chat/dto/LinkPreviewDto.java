package com.orbit.chat.dto;

public record LinkPreviewDto(
    String url,
    String host,
    String title,
    String description,
    String imageUrl,
    String siteName
) {}
