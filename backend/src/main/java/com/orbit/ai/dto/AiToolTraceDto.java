package com.orbit.ai.dto;

public record AiToolTraceDto(
    String tool,
    String status,
    String summary
) {}
