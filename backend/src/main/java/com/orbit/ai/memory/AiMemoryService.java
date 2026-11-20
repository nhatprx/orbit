package com.orbit.ai.memory;

import com.orbit.ai.dto.AiMemoryDto;
import com.orbit.ai.dto.CreateAiMemoryRequest;
import com.orbit.ai.entity.AiMemoryEntity;
import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.entity.AiScopeType;
import com.orbit.ai.gateway.LlmGatewayRouter;
import com.orbit.ai.repository.AiMemoryRepository;
import com.orbit.ai.service.AiProviderConfigService;
import com.orbit.common.ApiException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiMemoryService {

    private static final Set<String> CATEGORIES = Set.of("FACT", "DECISION", "PREFERENCE");

    private final AiMemoryRepository memoryRepository;
    private final VectorStoreClient vectorStore;
    private final LlmGatewayRouter gatewayRouter;
    private final AiProviderConfigService configService;

    public AiMemoryService(
        AiMemoryRepository memoryRepository,
        VectorStoreClient vectorStore,
        LlmGatewayRouter gatewayRouter,
        AiProviderConfigService configService
    ) {
        this.memoryRepository = memoryRepository;
        this.vectorStore = vectorStore;
        this.gatewayRouter = gatewayRouter;
        this.configService = configService;
    }

    @Transactional(readOnly = true)
    public List<AiMemoryDto> listMemories(UUID userId, AiScopeType scopeType, UUID workspaceId, UUID projectId) {
        return loadScoped(userId, scopeType, workspaceId, projectId, 30).stream()
            .map(AiMemoryDto::from)
            .toList();
    }

    @Transactional
    public AiMemoryDto createMemory(UUID userId, CreateAiMemoryRequest request) {
        AiScopeType scope = parseScope(request.scopeType());
        UUID workspaceId = parseUuid(request.workspaceId());
        UUID projectId = parseUuid(request.projectId());
        String category = request.category() != null && CATEGORIES.contains(request.category().trim().toUpperCase())
            ? request.category().trim().toUpperCase()
            : "FACT";

        AiMemoryEntity entity = new AiMemoryEntity();
        entity.setId(UUID.randomUUID());
        entity.setUserId(userId);
        entity.setScopeType(scope);
        entity.setWorkspaceId(scope == AiScopeType.USER ? null : workspaceId);
        entity.setProjectId(scope == AiScopeType.PROJECT ? projectId : null);
        entity.setCategory(category);
        entity.setContent(request.content().trim());
        entity.setPinned(Boolean.TRUE.equals(request.pinned()));

        indexInVectorStore(entity);
        return AiMemoryDto.from(memoryRepository.save(entity));
    }

    @Transactional
    public void deleteMemory(UUID userId, UUID memoryId) {
        AiMemoryEntity entity = memoryRepository.findByIdAndUserId(memoryId, userId).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "MEMORY_NOT_FOUND", "Memory not found.")
        );
        if (entity.getQdrantPointId() != null) {
            vectorStore.delete(entity.getQdrantPointId());
        }
        memoryRepository.delete(entity);
    }

    /** Recalls top relevant memories from Qdrant Cloud, falling back to PostgreSQL recency/pinned list. */
    @Transactional(readOnly = true)
    public List<String> recallRelevant(UUID userId, AiScopeType scopeType, UUID workspaceId, UUID projectId, String query) {
        Set<String> recalled = new LinkedHashSet<>();
        if (vectorStore.isAvailable() && query != null && !query.isBlank()) {
            AiProviderConfigEntity cfg = configService.getActiveEntity();
            List<Float> vector = gatewayRouter.embed(cfg, query);
            if (!vector.isEmpty()) {
                Map<String, String> filters = new LinkedHashMap<>();
                filters.put("scopeType", scopeType.name());
                if (scopeType == AiScopeType.USER) filters.put("userId", userId.toString());
                if (workspaceId != null && scopeType != AiScopeType.USER) filters.put("workspaceId", workspaceId.toString());
                if (projectId != null && scopeType == AiScopeType.PROJECT) filters.put("projectId", projectId.toString());
                for (VectorStoreClient.VectorHit hit : vectorStore.search(vector, filters, 5)) {
                    Object text = hit.payload().get("content");
                    if (text != null) recalled.add(String.valueOf(text));
                }
            }
        }
        for (AiMemoryEntity entity : loadScoped(userId, scopeType, workspaceId, projectId, 6)) {
            recalled.add("[" + entity.getCategory() + "] " + entity.getContent());
            if (recalled.size() >= 8) break;
        }
        return new ArrayList<>(recalled);
    }

    /** Captures explicit "remember ..." user directives automatically into long-term memory. */
    @Transactional
    public void captureExplicitDirective(UUID userId, AiScopeType scope, UUID workspaceId, UUID projectId, String prompt) {
        if (prompt == null) return;
        String lower = prompt.trim().toLowerCase();
        if (!lower.startsWith("remember ") && !lower.startsWith("remember:") && !lower.startsWith("please remember ")) {
            return;
        }
        String cleaned = prompt.trim().replaceFirst("(?i)^(please\\s+)?remember[:\\s]+", "").trim();
        if (cleaned.length() < 8 || cleaned.length() > 500) return;
        createMemory(userId, new CreateAiMemoryRequest(
            scope.name(),
            workspaceId != null ? workspaceId.toString() : null,
            projectId != null ? projectId.toString() : null,
            "PREFERENCE",
            cleaned,
            false
        ));
    }

    private void indexInVectorStore(AiMemoryEntity entity) {
        if (!vectorStore.isAvailable()) return;
        AiProviderConfigEntity cfg = configService.getActiveEntity();
        List<Float> vector = gatewayRouter.embed(cfg, entity.getContent());
        if (vector.isEmpty()) return;
        String pointId = entity.getId().toString();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("memoryId", entity.getId().toString());
        payload.put("userId", entity.getUserId().toString());
        payload.put("scopeType", entity.getScopeType().name());
        payload.put("category", entity.getCategory());
        payload.put("content", entity.getContent());
        if (entity.getWorkspaceId() != null) payload.put("workspaceId", entity.getWorkspaceId().toString());
        if (entity.getProjectId() != null) payload.put("projectId", entity.getProjectId().toString());
        if (vectorStore.upsert(pointId, vector, payload)) {
            entity.setQdrantPointId(pointId);
        }
    }

    private List<AiMemoryEntity> loadScoped(UUID userId, AiScopeType scope, UUID workspaceId, UUID projectId, int limit) {
        PageRequest page = PageRequest.of(0, limit);
        if (scope == AiScopeType.PROJECT && projectId != null) {
            return memoryRepository.findByScopeTypeAndProjectIdOrderByPinnedDescUpdatedAtDesc(scope, projectId, page);
        }
        if (scope == AiScopeType.WORKSPACE && workspaceId != null) {
            return memoryRepository.findByScopeTypeAndWorkspaceIdOrderByPinnedDescUpdatedAtDesc(scope, workspaceId, page);
        }
        return memoryRepository.findByUserIdAndScopeTypeOrderByPinnedDescUpdatedAtDesc(userId, AiScopeType.USER, page);
    }

    private AiScopeType parseScope(String raw) {
        if (raw == null || raw.isBlank()) return AiScopeType.USER;
        try {
            return AiScopeType.valueOf(raw.trim().toUpperCase());
        } catch (Exception ex) {
            return AiScopeType.USER;
        }
    }

    private UUID parseUuid(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return UUID.fromString(raw.trim());
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_UUID", "Invalid identifier format.");
        }
    }
}
