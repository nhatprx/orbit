package com.orbit.ai.controller;

import com.orbit.ai.dto.AiProviderConfigDto;
import com.orbit.ai.dto.UpdateAiProviderConfigRequest;
import com.orbit.ai.service.AiProviderConfigService;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.ApiException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/ai/config")
public class AiAdminConfigController {

    private final AiProviderConfigService configService;

    public AiAdminConfigController(AiProviderConfigService configService) {
        this.configService = configService;
    }

    @GetMapping
    public ResponseEntity<AiProviderConfigDto> getConfig(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        requireAdmin(principal);
        return ResponseEntity.ok(configService.getConfigDto());
    }

    @PutMapping
    public ResponseEntity<AiProviderConfigDto> updateConfig(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody UpdateAiProviderConfigRequest request
    ) {
        requireAdmin(principal);
        return ResponseEntity.ok(configService.updateConfig(principal.userId(), request));
    }

    private void requireAdmin(AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        }
        if (!"admin".equalsIgnoreCase(principal.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "Admin role is required to manage AI configuration.");
        }
    }
}
