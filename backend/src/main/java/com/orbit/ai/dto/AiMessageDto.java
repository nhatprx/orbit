package com.orbit.ai.dto;

import java.util.List;

public record AiMessageDto(
    String id,
    String threadId,
    String role,
    String content,
    String modelUsed,
    String providerUsed,
    List<AiToolTraceDto> toolTraces,
    List<AiCitationDto> citations,
    int inputTokens,
    int outputTokens,
    String timestamp
) {}
