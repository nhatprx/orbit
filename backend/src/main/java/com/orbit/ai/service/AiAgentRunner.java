package com.orbit.ai.service;

import com.orbit.ai.dto.AiCitationDto;
import com.orbit.ai.dto.AiToolTraceDto;
import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.entity.AiProviderType;
import com.orbit.ai.gateway.LlmGatewayRouter;
import com.orbit.ai.gateway.LlmModels.LlmMessage;
import com.orbit.ai.gateway.LlmModels.LlmRequest;
import com.orbit.ai.gateway.LlmModels.LlmResponse;
import com.orbit.ai.gateway.LlmModels.LlmToolCall;
import com.orbit.ai.tools.AiToolContext;
import com.orbit.ai.tools.AiToolRegistry;
import com.orbit.ai.tools.AiToolResult;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;
import org.springframework.stereotype.Component;

/** Executes bounded multi-step tool-use rounds against the active cloud LLM gateway. */
@Component
public class AiAgentRunner {

    private static final int MAX_TOOL_ROUNDS = 4;

    private final LlmGatewayRouter gatewayRouter;
    private final AiToolRegistry toolRegistry;

    public AiAgentRunner(LlmGatewayRouter gatewayRouter, AiToolRegistry toolRegistry) {
        this.gatewayRouter = gatewayRouter;
        this.toolRegistry = toolRegistry;
    }

    public record AgentRunResult(
        String content,
        List<AiToolTraceDto> traces,
        List<AiCitationDto> citations,
        int inputTokens,
        int outputTokens,
        String generationId,
        BigDecimal costUsd
    ) {}

    public AgentRunResult run(
        AiProviderConfigEntity cfg,
        String modelId,
        String systemPrompt,
        List<LlmMessage> messages,
        AiToolContext toolCtx,
        Consumer<String> onToken,
        Consumer<AiToolTraceDto> onToolEvent
    ) {
        return run(cfg, modelId, systemPrompt, messages, toolCtx, null, onToken, onToolEvent);
    }

    public AgentRunResult run(
        AiProviderConfigEntity cfg,
        String modelId,
        String systemPrompt,
        List<LlmMessage> messages,
        AiToolContext toolCtx,
        String apiKeyOverride,
        Consumer<String> onToken,
        Consumer<AiToolTraceDto> onToolEvent
    ) {
        List<AiToolTraceDto> traces = new ArrayList<>();
        List<AiCitationDto> citations = new ArrayList<>();
        String finalText = "";
        int totalIn = 0;
        int totalOut = 0;
        String lastGenId = null;
        BigDecimal totalCost = BigDecimal.ZERO;

        for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
            LlmRequest llmReq = new LlmRequest(
                modelId,
                cfg.getBedrockRegion(),
                systemPrompt,
                messages,
                toolRegistry.specsFor(toolCtx),
                toolCtx.webSearchEnabled() && cfg.getActiveProvider() == AiProviderType.OPENROUTER,
                2048,
                apiKeyOverride
            );
            LlmResponse resp = gatewayRouter.complete(cfg, llmReq, delta -> {
                if (onToken != null) onToken.accept(delta);
            });
            totalIn += resp.inputTokens();
            totalOut += resp.outputTokens();
            if (resp.generationId() != null) lastGenId = resp.generationId();
            if (resp.costUsd() != null) totalCost = totalCost.add(resp.costUsd());

            if (resp.toolCalls().isEmpty()) {
                finalText = resp.content();
                break;
            }
            messages.add(LlmMessage.assistant(resp.content(), resp.toolCalls()));
            for (LlmToolCall call : resp.toolCalls()) {
                AiToolTraceDto started = new AiToolTraceDto(call.name(), "running", "Executing " + call.name());
                if (onToolEvent != null) onToolEvent.accept(started);
                AiToolResult result = toolRegistry.execute(toolCtx, call.name(), call.arguments());
                AiToolTraceDto done = new AiToolTraceDto(call.name(), "done", result.summary());
                traces.add(done);
                citations.addAll(result.citations());
                if (onToolEvent != null) onToolEvent.accept(done);
                messages.add(LlmMessage.toolResult(call.id(), call.name(), result.output()));
            }
        }

        String resolved = finalText.isBlank()
            ? "Completed tool inspection without a text response."
            : finalText;
        return new AgentRunResult(resolved, traces, citations, totalIn, totalOut, lastGenId, totalCost);
    }
}
