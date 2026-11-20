package com.orbit.ai.tools;

import com.orbit.ai.dto.AiCitationDto;
import java.util.List;

public record AiToolResult(
    String output,
    String summary,
    List<AiCitationDto> citations
) {
    public static AiToolResult text(String output, String summary) {
        return new AiToolResult(output, summary, List.of());
    }
}
