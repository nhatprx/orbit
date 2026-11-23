package com.orbit.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.ai.dto.AiMessageDto;
import com.orbit.ai.dto.AiThreadDto;
import com.orbit.ai.dto.AiToolTraceDto;
import com.orbit.ai.dto.CreateAiThreadRequest;
import com.orbit.ai.dto.SendAiPromptRequest;
import com.orbit.ai.entity.AiMessageEntity;
import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.entity.AiScopeType;
import com.orbit.ai.entity.AiThreadEntity;
import com.orbit.ai.gateway.LlmModels.LlmMessage;
import com.orbit.ai.memory.AiMemoryService;
import com.orbit.ai.repository.AiMessageRepository;
import com.orbit.ai.repository.AiThreadRepository;
import com.orbit.ai.service.AiAgentRunner.AgentRunResult;
import com.orbit.ai.tools.AiToolContext;
import com.orbit.common.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiChatService {

    private static final Set<String> MODEL_TIERS = Set.of("orbit-fast", "orbit-pro", "orbit-coder");

    private final AiThreadRepository threadRepository;
    private final AiMessageRepository messageRepository;
    private final AiProviderConfigService configService;
    private final AiMemoryService memoryService;
    private final AiPromptBuilder promptBuilder;
    private final AiAgentRunner agentRunner;
    private final AiRateLimiter rateLimiter;
    private final AiUsageService usageService;
    private final ObjectMapper objectMapper;

    public AiChatService(
        AiThreadRepository threadRepository, AiMessageRepository messageRepository,
        AiProviderConfigService configService, AiMemoryService memoryService,
        AiPromptBuilder promptBuilder, AiAgentRunner agentRunner,
        AiRateLimiter rateLimiter, AiUsageService usageService, ObjectMapper objectMapper
    ) {
        this.threadRepository = threadRepository;
        this.messageRepository = messageRepository;
        this.configService = configService;
        this.memoryService = memoryService;
        this.promptBuilder = promptBuilder;
        this.agentRunner = agentRunner;
        this.rateLimiter = rateLimiter;
        this.usageService = usageService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<AiThreadDto> listThreads(UUID userId, AiScopeType scope, UUID workspaceId) {
        PageRequest page = PageRequest.of(0, 40);
        List<AiThreadEntity> rows = scope != null && workspaceId != null
            ? threadRepository.findByUserIdAndScopeTypeAndWorkspaceIdOrderByUpdatedAtDesc(userId, scope, workspaceId, page)
            : threadRepository.findByUserIdOrderByUpdatedAtDesc(userId, page);
        return rows.stream().map(AiThreadDto::from).toList();
    }

    @Transactional
    public AiThreadDto createThread(UUID userId, CreateAiThreadRequest request) {
        AiScopeType scope = parseScope(request.scopeType());
        AiThreadEntity thread = new AiThreadEntity();
        thread.setId(UUID.randomUUID());
        thread.setUserId(userId);
        thread.setScopeType(scope);
        thread.setWorkspaceId(scope == AiScopeType.USER ? null : parseUuid(request.workspaceId()));
        thread.setProjectId(scope == AiScopeType.PROJECT ? parseUuid(request.projectId()) : null);
        thread.setTitle(request.title() != null && !request.title().isBlank() ? request.title().trim() : "New AI Session");
        thread.setModelTier(normalizeTier(request.model()));
        return AiThreadDto.from(threadRepository.save(thread));
    }

    @Transactional
    public void deleteThread(UUID userId, UUID threadId) { threadRepository.delete(requireThread(userId, threadId)); }

    @Transactional(readOnly = true)
    public List<AiMessageDto> listMessages(UUID userId, UUID threadId) {
        requireThread(userId, threadId);
        return messageRepository.findByThreadIdOrderByCreatedAtAsc(threadId, PageRequest.of(0, 100)).stream()
            .map(this::toMessageDto).toList();
    }

    public AiMessageDto sendPrompt(
        UUID userId, UUID threadId, SendAiPromptRequest request,
        Consumer<String> onToken, Consumer<AiToolTraceDto> onToolEvent
    ) {
        rateLimiter.checkAllowed(userId);
        AiUsageService.ResolvedKey resolvedKey = usageService.checkBudgetAndResolveKey(userId);
        AiThreadEntity thread = requireThread(userId, threadId);
        String prompt = request.prompt().trim();
        String tier = request.model() != null ? normalizeTier(request.model()) : thread.getModelTier();

        saveUserMessage(threadId, prompt);
        if ("New AI Session".equals(thread.getTitle())) {
            thread.setTitle(prompt.length() > 48 ? prompt.substring(0, 48) + "..." : prompt);
        }
        thread.setModelTier(tier);
        memoryService.captureExplicitDirective(userId, thread.getScopeType(), thread.getWorkspaceId(), thread.getProjectId(), prompt);

        AiProviderConfigEntity cfg = configService.getActiveEntity();
        boolean webSearch = cfg.isWebSearchEnabled() && Boolean.TRUE.equals(request.webSearch());
        String modelId = configService.resolveModelId(cfg, tier);

        List<String> memories = memoryService.recallRelevant(userId, thread.getScopeType(), thread.getWorkspaceId(), thread.getProjectId(), prompt);
        String systemPrompt = promptBuilder.buildSystemPrompt(thread, memories, webSearch);
        List<LlmMessage> window = promptBuilder.buildHistoryWindow(
            messageRepository.findByThreadIdOrderByCreatedAtDesc(threadId, PageRequest.of(0, 16))
        );
        AiToolContext toolCtx = new AiToolContext(userId, thread.getScopeType(), thread.getWorkspaceId(), thread.getProjectId(), webSearch);
        AgentRunResult result = agentRunner.run(cfg, modelId, systemPrompt, window, toolCtx, resolvedKey.apiKeyOverride(), onToken, onToolEvent);

        AiMessageEntity saved = saveAssistantMessage(threadId, cfg, modelId, result);
        usageService.recordUsage(
            userId, threadId, saved.getId(), cfg.getActiveProvider().name(), modelId,
            result.generationId(), result.inputTokens(), result.outputTokens(),
            result.costUsd(), resolvedKey.keySource()
        );
        thread.setMessageCount(thread.getMessageCount() + 2);
        thread.setRollingSummary(promptBuilder.updateRollingSummary(thread.getRollingSummary(), prompt, saved.getContent()));
        thread.setUpdatedAt(Instant.now());
        threadRepository.save(thread);
        return toMessageDto(saved);
    }

    private void saveUserMessage(UUID threadId, String prompt) {
        AiMessageEntity msg = new AiMessageEntity();
        msg.setId(UUID.randomUUID());
        msg.setThreadId(threadId);
        msg.setRole("user");
        msg.setContent(prompt);
        messageRepository.save(msg);
    }

    private AiMessageEntity saveAssistantMessage(UUID threadId, AiProviderConfigEntity cfg, String modelId, AgentRunResult res) {
        AiMessageEntity msg = new AiMessageEntity();
        msg.setId(UUID.randomUUID());
        msg.setThreadId(threadId);
        msg.setRole("assistant");
        msg.setContent(res.content());
        msg.setModelUsed(modelId);
        msg.setProviderUsed(cfg.getActiveProvider().name());
        msg.setToolTracesJson(writeJson(res.traces()));
        msg.setCitationsJson(writeJson(res.citations()));
        msg.setInputTokens(res.inputTokens());
        msg.setOutputTokens(res.outputTokens());
        msg.setCostUsd(res.costUsd() != null ? res.costUsd() : java.math.BigDecimal.ZERO);
        msg.setGenerationId(res.generationId());
        return messageRepository.save(msg);
    }

    private AiThreadEntity requireThread(UUID userId, UUID threadId) {
        return threadRepository.findByIdAndUserId(threadId, userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "AI_THREAD_NOT_FOUND", "AI thread not found."));
    }

    private AiMessageDto toMessageDto(AiMessageEntity e) {
        return new AiMessageDto(
            e.getId().toString(), e.getThreadId().toString(), e.getRole(), e.getContent(),
            e.getModelUsed(), e.getProviderUsed(), readJson(e.getToolTracesJson(), new TypeReference<>() {}),
            readJson(e.getCitationsJson(), new TypeReference<>() {}), e.getInputTokens(), e.getOutputTokens(),
            e.getCostUsd(), e.getGenerationId(), e.getCreatedAt() != null ? e.getCreatedAt().toString() : null
        );
    }

    private String normalizeTier(String tier) { return tier != null && MODEL_TIERS.contains(tier.trim()) ? tier.trim() : "orbit-pro"; }

    private AiScopeType parseScope(String raw) {
        if (raw == null || raw.isBlank()) return AiScopeType.USER;
        try { return AiScopeType.valueOf(raw.trim().toUpperCase()); } catch (Exception ex) { return AiScopeType.USER; }
    }

    private UUID parseUuid(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try { return UUID.fromString(raw.trim()); }
        catch (Exception ex) { throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_UUID", "Invalid identifier format."); }
    }

    private String writeJson(Object obj) { try { return objectMapper.writeValueAsString(obj); } catch (Exception ex) { return "[]"; } }

    private <T> List<T> readJson(String raw, TypeReference<List<T>> type) {
        if (raw == null || raw.isBlank()) return List.of();
        try { return objectMapper.readValue(raw, type); } catch (Exception ex) { return List.of(); }
    }
}
