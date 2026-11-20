package com.orbit.ai.rag;

import com.orbit.ai.config.AiProperties;
import com.orbit.ai.dto.AiCitationDto;
import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.entity.AiScopeType;
import com.orbit.ai.gateway.LlmGatewayRouter;
import com.orbit.ai.memory.VectorStoreClient;
import com.orbit.ai.rag.entity.AiDocumentChunkEntity;
import com.orbit.ai.rag.repository.AiDocumentChunkRepository;
import com.orbit.ai.rag.repository.AiDocumentIndexStatusRepository;
import com.orbit.ai.service.AiProviderConfigService;
import com.orbit.ai.tools.AiToolContext;
import com.orbit.ai.tools.AiToolResult;
import com.orbit.cloud.service.CloudAccessGuard;
import com.orbit.cloud.service.CloudScope;
import com.orbit.workspace.permission.Permissions;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** RBAC-enforced Hybrid RAG search across Qdrant Cloud vectors and PostgreSQL Full-Text Search. */
@Service
public class AiRagSearchService {

    private final CloudAccessGuard accessGuard;
    private final AiDocumentChunkRepository chunkRepository;
    private final AiDocumentIndexStatusRepository statusRepository;
    private final VectorStoreClient vectorStore;
    private final LlmGatewayRouter gatewayRouter;
    private final AiProviderConfigService configService;
    private final AiProperties properties;

    public AiRagSearchService(
        CloudAccessGuard accessGuard,
        AiDocumentChunkRepository chunkRepository,
        AiDocumentIndexStatusRepository statusRepository,
        VectorStoreClient vectorStore,
        LlmGatewayRouter gatewayRouter,
        AiProviderConfigService configService,
        AiProperties properties
    ) {
        this.accessGuard = accessGuard;
        this.chunkRepository = chunkRepository;
        this.statusRepository = statusRepository;
        this.vectorStore = vectorStore;
        this.gatewayRouter = gatewayRouter;
        this.configService = configService;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public List<AiDocumentIndexDto> listIndexedFiles(UUID userId, AiScopeType scopeType, UUID workspaceId, UUID projectId) {
        CloudScope scope = resolveScope(userId, scopeType, workspaceId, projectId);
        return statusRepository.findByScopeTypeAndScopeIdOrderByUpdatedAtDesc(
            scope.type().name(), scope.scopeId(), PageRequest.of(0, 50)
        ).stream().map(AiDocumentIndexDto::from).toList();
    }

    @Transactional(readOnly = true)
    public AiToolResult hybridSearch(AiToolContext ctx, String query) {
        if (query == null || query.isBlank()) {
            return AiToolResult.text("A search query is required to search inside file contents.", "Empty query");
        }
        CloudScope scope = resolveScope(ctx.userId(), ctx.scopeType(), ctx.workspaceId(), ctx.projectId());
        Map<String, String> mergedText = new LinkedHashMap<>();
        Map<String, AiCitationDto> citations = new LinkedHashMap<>();

        if (vectorStore.isAvailable()) {
            AiProviderConfigEntity cfg = configService.getActiveEntity();
            List<Float> vec = gatewayRouter.embed(cfg, query);
            if (!vec.isEmpty()) {
                Map<String, String> filters = Map.of(
                    "scopeType", scope.type().name(),
                    "scopeId", scope.scopeId().toString()
                );
                String col = properties.getQdrant().getFilesCollection();
                for (VectorStoreClient.VectorHit hit : vectorStore.search(col, vec, filters, 5)) {
                    String filename = String.valueOf(hit.payload().getOrDefault("filename", "Document"));
                    String nodeId = String.valueOf(hit.payload().getOrDefault("nodeId", hit.pointId()));
                    Object pageObj = hit.payload().get("pageNumber");
                    String label = pageObj != null ? filename + " (p. " + pageObj + ")" : filename;
                    String content = String.valueOf(hit.payload().getOrDefault("content", ""));
                    mergedText.putIfAbsent(hit.pointId(), "[" + label + "]\n" + content);
                    citations.putIfAbsent(label, new AiCitationDto("file", label, nodeId));
                }
            }
        }

        List<AiDocumentChunkEntity> ftsHits = chunkRepository.searchFullText(
            scope.type().name(), scope.scopeId(), query.trim(), 5
        );
        for (AiDocumentChunkEntity chunk : ftsHits) {
            String key = chunk.getId().toString();
            String label = chunk.getPageNumber() != null
                ? chunk.getFilename() + " (p. " + chunk.getPageNumber() + ")"
                : chunk.getFilename();
            mergedText.putIfAbsent(key, "[" + label + "]\n" + chunk.getContent());
            citations.putIfAbsent(label, new AiCitationDto("file", label, chunk.getNodeId().toString()));
        }

        if (mergedText.isEmpty()) {
            return AiToolResult.text("No matching passages found in indexed files for: " + query, "0 passages found");
        }

        StringBuilder out = new StringBuilder("Relevant passages from indexed Cloud Files:\n\n");
        int count = 0;
        for (String passage : mergedText.values()) {
            out.append(passage).append("\n---\n");
            if (++count >= 6) break;
        }
        return new AiToolResult(
            out.toString(),
            "Found " + count + " passages across " + citations.size() + " files",
            new ArrayList<>(citations.values())
        );
    }

    public CloudScope resolveScope(UUID userId, AiScopeType scopeType, UUID workspaceId, UUID projectId) {
        if (scopeType == AiScopeType.PROJECT && workspaceId != null && projectId != null) {
            return accessGuard.requireProjectScope(userId, workspaceId, projectId, Permissions.PFILES_READ);
        }
        if (scopeType == AiScopeType.WORKSPACE && workspaceId != null) {
            return accessGuard.requireWorkspaceScope(userId, workspaceId, Permissions.FILES_READ);
        }
        return accessGuard.requireUserScope(userId);
    }
}
