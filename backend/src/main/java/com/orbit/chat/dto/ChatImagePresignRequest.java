package com.orbit.chat.dto;

public record ChatImagePresignRequest(
    String filename,
    String contentType,
    Long fileSize
) {}
