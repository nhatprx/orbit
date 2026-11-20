package com.orbit.ai.controller;

import com.orbit.ai.dto.AiMemoryDto;
import com.orbit.ai.dto.AiMessageDto;
import com.orbit.ai.dto.AiThreadDto;
import com.orbit.ai.dto.CreateAiMemoryRequest;
import com.orbit.ai.dto.CreateAiThreadRequest;
import com.orbit.ai.dto.SendAiPromptRequest;
import com.orbit.ai.entity.AiScopeType;
import com.orbit.ai.memory.AiMemoryService;
import com.orbit.ai.service.AiChatService;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.ApiException;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/ai")
public class AiChatController {

    private final AiChatService chatService;
    private final AiMemoryService memoryService;

    public AiChatController(AiChatService chatService, AiMemoryService memoryService) {
        this.chatService = chatService;
        this.memoryService = memoryService;
    }

    @GetMapping("/threads")
    public ResponseEntity<List<AiThreadDto>> listThreads(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) String scopeType,
        @RequestParam(required = false) UUID workspaceId
    ) {
        return ResponseEntity.ok(chatService.listThreads(requireUser(principal), parseScope(scopeType), workspaceId));
    }

    @PostMapping("/threads")
    public ResponseEntity<AiThreadDto> createThread(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody CreateAiThreadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(chatService.createThread(requireUser(principal), request));
    }

    @DeleteMapping("/threads/{threadId}")
    public ResponseEntity<Void> deleteThread(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID threadId
    ) {
        chatService.deleteThread(requireUser(principal), threadId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/threads/{threadId}/messages")
    public ResponseEntity<List<AiMessageDto>> listMessages(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID threadId
    ) {
        return ResponseEntity.ok(chatService.listMessages(requireUser(principal), threadId));
    }

    @PostMapping(value = "/threads/{threadId}/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMessage(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID threadId,
        @Valid @RequestBody SendAiPromptRequest request
    ) {
        UUID userId = requireUser(principal);
        SseEmitter emitter = new SseEmitter(120_000L);
        Thread.ofVirtual().start(() -> {
            try {
                AiMessageDto saved = chatService.sendPrompt(
                    userId,
                    threadId,
                    request,
                    delta -> sendEvent(emitter, "token", Map.of("delta", delta)),
                    trace -> sendEvent(emitter, "tool", trace)
                );
                sendEvent(emitter, "done", saved);
                emitter.complete();
            } catch (Exception ex) {
                sendEvent(emitter, "error", Map.of("message", ex.getMessage() != null ? ex.getMessage() : "AI request failed."));
                emitter.complete();
            }
        });
        return emitter;
    }

    @GetMapping("/memories")
    public ResponseEntity<List<AiMemoryDto>> listMemories(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(defaultValue = "USER") String scopeType,
        @RequestParam(required = false) UUID workspaceId,
        @RequestParam(required = false) UUID projectId
    ) {
        AiScopeType scope = parseScope(scopeType);
        return ResponseEntity.ok(memoryService.listMemories(
            requireUser(principal), scope != null ? scope : AiScopeType.USER, workspaceId, projectId
        ));
    }

    @PostMapping("/memories")
    public ResponseEntity<AiMemoryDto> createMemory(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody CreateAiMemoryRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(memoryService.createMemory(requireUser(principal), request));
    }

    @DeleteMapping("/memories/{memoryId}")
    public ResponseEntity<Void> deleteMemory(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID memoryId
    ) {
        memoryService.deleteMemory(requireUser(principal), memoryId);
        return ResponseEntity.noContent().build();
    }

    private void sendEvent(SseEmitter emitter, String name, Object data) {
        try {
            emitter.send(SseEmitter.event().name(name).data(data));
        } catch (IOException ignored) {
            // Client disconnected
        }
    }

    private UUID requireUser(AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        }
        return principal.userId();
    }

    private AiScopeType parseScope(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return AiScopeType.valueOf(raw.trim().toUpperCase());
        } catch (Exception ex) {
            return null;
        }
    }
}
