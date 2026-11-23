package com.orbit.ai.controller;

import com.orbit.ai.dto.OpenRouterDtos.AdminUserAiUsagePageDto;
import com.orbit.ai.dto.OpenRouterDtos.OpenRouterCreditsDto;
import com.orbit.ai.service.AiOpenRouterAdminService;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/ai/openrouter")
public class AiAdminOpenRouterController {

    public record UpdateUserBudgetRequest(
        @NotNull @DecimalMin("0.0") BigDecimal monthlyBudgetUsd,
        boolean provisionSubKey
    ) {}

    private final AiOpenRouterAdminService adminService;

    public AiAdminOpenRouterController(AiOpenRouterAdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/credits")
    public ResponseEntity<OpenRouterCreditsDto> getCredits(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        requireAdmin(principal);
        return ResponseEntity.ok(adminService.getAccountCredits());
    }

    @GetMapping("/usage")
    public ResponseEntity<AdminUserAiUsagePageDto> listUserUsage(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String search
    ) {
        requireAdmin(principal);
        return ResponseEntity.ok(adminService.listUserUsage(page, size, search));
    }

    @PutMapping("/users/{userId}/budget")
    public ResponseEntity<Void> updateUserBudget(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID userId,
        @Valid @RequestBody UpdateUserBudgetRequest request
    ) {
        requireAdmin(principal);
        adminService.updateUserBudget(userId, request.monthlyBudgetUsd(), request.provisionSubKey());
        return ResponseEntity.noContent().build();
    }

    private void requireAdmin(AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        }
        if (!"admin".equalsIgnoreCase(principal.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "Admin role is required.");
        }
    }
}
