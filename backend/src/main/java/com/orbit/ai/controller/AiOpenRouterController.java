package com.orbit.ai.controller;

import com.orbit.ai.dto.OpenRouterDtos.AiUsageSummaryDto;
import com.orbit.ai.dto.OpenRouterDtos.OpenRouterModelDto;
import com.orbit.ai.gateway.OpenRouterClient;
import com.orbit.ai.service.AiUsageService;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
public class AiOpenRouterController {

    public record OAuthExchangeRequest(@NotBlank String code, @NotBlank String codeVerifier) {}
    public record PersonalKeyRequest(@NotBlank String apiKey) {}

    private final OpenRouterClient openRouterClient;
    private final AiUsageService usageService;

    public AiOpenRouterController(OpenRouterClient openRouterClient, AiUsageService usageService) {
        this.openRouterClient = openRouterClient;
        this.usageService = usageService;
    }

    @GetMapping("/openrouter/models")
    public ResponseEntity<List<OpenRouterModelDto>> listModels(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        requireAuth(principal);
        return ResponseEntity.ok(openRouterClient.fetchModels());
    }

    @GetMapping("/usage/me")
    public ResponseEntity<AiUsageSummaryDto> getMyUsage(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        requireAuth(principal);
        return ResponseEntity.ok(usageService.getMyUsageSummary(principal.userId()));
    }

    @PostMapping("/openrouter/oauth/exchange")
    public ResponseEntity<AiUsageSummaryDto> exchangeOAuthCode(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody OAuthExchangeRequest request
    ) {
        requireAuth(principal);
        return ResponseEntity.ok(usageService.connectOAuthKey(principal.userId(), request.code(), request.codeVerifier()));
    }

    @PutMapping("/openrouter/personal-key")
    public ResponseEntity<AiUsageSummaryDto> savePersonalKey(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody PersonalKeyRequest request
    ) {
        requireAuth(principal);
        return ResponseEntity.ok(usageService.savePersonalKey(principal.userId(), request.apiKey()));
    }

    @DeleteMapping("/openrouter/personal-key")
    public ResponseEntity<AiUsageSummaryDto> deletePersonalKey(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        requireAuth(principal);
        return ResponseEntity.ok(usageService.clearPersonalKey(principal.userId()));
    }

    private void requireAuth(AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        }
    }
}
