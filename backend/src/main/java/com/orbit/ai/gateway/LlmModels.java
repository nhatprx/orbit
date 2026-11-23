package com.orbit.ai.gateway;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public final class LlmModels {

    private LlmModels() {}

    public record LlmToolSpec(
        String name,
        String description,
        Map<String, Object> inputSchema
    ) {}

    public record LlmToolCall(
        String id,
        String name,
        Map<String, Object> arguments
    ) {}

    public record LlmMessage(
        String role,
        String content,
        String toolCallId,
        String toolName,
        List<LlmToolCall> toolCalls
    ) {
        public static LlmMessage user(String content) {
            return new LlmMessage("user", content, null, null, List.of());
        }

        public static LlmMessage assistant(String content, List<LlmToolCall> toolCalls) {
            return new LlmMessage("assistant", content, null, null, toolCalls == null ? List.of() : toolCalls);
        }

        public static LlmMessage toolResult(String toolCallId, String toolName, String content) {
            return new LlmMessage("tool", content, toolCallId, toolName, List.of());
        }
    }

    public record LlmRequest(
        String modelId,
        String region,
        String systemPrompt,
        List<LlmMessage> messages,
        List<LlmToolSpec> tools,
        boolean enableOnlineSearch,
        int maxTokens,
        String apiKeyOverride
    ) {
        public LlmRequest(
            String modelId,
            String region,
            String systemPrompt,
            List<LlmMessage> messages,
            List<LlmToolSpec> tools,
            boolean enableOnlineSearch,
            int maxTokens
        ) {
            this(modelId, region, systemPrompt, messages, tools, enableOnlineSearch, maxTokens, null);
        }
    }

    public record LlmResponse(
        String content,
        List<LlmToolCall> toolCalls,
        int inputTokens,
        int outputTokens,
        String generationId,
        BigDecimal costUsd
    ) {
        public LlmResponse(
            String content,
            List<LlmToolCall> toolCalls,
            int inputTokens,
            int outputTokens
        ) {
            this(content, toolCalls, inputTokens, outputTokens, null, BigDecimal.ZERO);
        }
    }

    @FunctionalInterface
    public interface LlmStreamListener {
        void onToken(String delta);
    }
}
