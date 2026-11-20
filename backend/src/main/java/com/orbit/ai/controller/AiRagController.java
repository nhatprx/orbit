package com.orbit.ai.controller;

import com.orbit.ai.entity.AiScopeType;
import com.orbit.ai.rag.AiDocumentIndexDto;
import com.orbit.ai.rag.AiFileIndexingService;
import com.orbit.ai.rag.AiRagSearchService;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.cloud.service.CloudScope;
import com.orbit.common.ApiException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai/rag")
public class AiRagController {

    private final AiRagSearchService ragSearchService;
    private final AiFileIndexingService indexingService;
    private final CloudNodeRepository nodeRepository;

    public AiRagController(
        AiRagSearchService ragSearchService,
        AiFileIndexingService indexingService,
        CloudNodeRepository nodeRepository
    ) {
        this.ragSearchService = ragSearchService;
        this.indexingService = indexingService;
        this.nodeRepository = nodeRepository;
    }

    @GetMapping("/files")
    public ResponseEntity<List<AiDocumentIndexDto>> listIndexedFiles(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(defaultValue = "USER") String scopeType,
        @RequestParam(required = false) UUID workspaceId,
        @RequestParam(required = false) UUID projectId
    ) {
        UUID userId = requireUser(principal);
        return ResponseEntity.ok(ragSearchService.listIndexedFiles(userId, parseScope(scopeType), workspaceId, projectId));
    }

    @PostMapping("/index/{nodeId}")
    public ResponseEntity<Map<String, String>> triggerIndex(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID nodeId,
        @RequestParam(defaultValue = "USER") String scopeType,
        @RequestParam(required = false) UUID workspaceId,
        @RequestParam(required = false) UUID projectId
    ) {
        UUID userId = requireUser(principal);
        CloudScope scope = ragSearchService.resolveScope(userId, parseScope(scopeType), workspaceId, projectId);
        CloudNodeEntity node = nodeRepository.findByIdAndScopeTypeAndScopeId(nodeId, scope.type(), scope.scopeId())
            .orElseThrow(() -> ApiException.notFound("NODE_NOT_FOUND", "Cloud file not found in this scope."));
        indexingService.triggerAsyncIndex(node.getId());
        return ResponseEntity.accepted().body(Map.of("status", "QUEUED", "nodeId", node.getId().toString()));
    }

    private UUID requireUser(AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        }
        return principal.userId();
    }

    private AiScopeType parseScope(String raw) {
        try {
            return AiScopeType.valueOf(raw.trim().toUpperCase());
        } catch (Exception ex) {
            return AiScopeType.USER;
        }
    }
}
