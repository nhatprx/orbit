package com.orbit.whiteboard.dto;

public record UpsertWhiteboardAssetRequest(
    String mimeType,
    String dataUrl
) {}
