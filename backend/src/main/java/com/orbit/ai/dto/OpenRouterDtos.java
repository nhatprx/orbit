package com.orbit.ai.dto;

import java.math.BigDecimal;
import java.util.List;

public final class OpenRouterDtos {

    private OpenRouterDtos() {}

    public record OpenRouterModelDto(
        String id,
        String name,
        int contextLength,
        String promptPricePerMillion,
        String completionPricePerMillion
    ) {}

    public record OpenRouterCreditsDto(
        BigDecimal totalCreditsUsd,
        BigDecimal totalUsageUsd,
        BigDecimal remainingCreditsUsd
    ) {}

    public record ProvisionedKeyResult(
        String key,
        String hash,
        BigDecimal limitUsd
    ) {}

    public record AiUsageEntryDto(
        String id,
        String threadId,
        String modelUsed,
        String providerUsed,
        int inputTokens,
        int outputTokens,
        BigDecimal costUsd,
        String keySource,
        String createdAt
    ) {}

    public record AiUsageSummaryDto(
        BigDecimal currentMonthCostUsd,
        BigDecimal totalCostUsd,
        BigDecimal monthlyBudgetUsd,
        BigDecimal remainingBudgetUsd,
        long currentMonthInputTokens,
        long currentMonthOutputTokens,
        String keySource,
        boolean hasPersonalKey,
        String personalKeyPreview,
        boolean hasProvisionedKey,
        List<AiUsageEntryDto> recentEntries
    ) {}

    public record AdminUserAiUsageDto(
        String userId,
        String fullName,
        String email,
        BigDecimal currentMonthCostUsd,
        long currentMonthTokens,
        long requestCount,
        BigDecimal monthlyBudgetUsd,
        boolean hasProvisionedKey,
        boolean hasPersonalKey,
        List<String> modelsUsed
    ) {}

    public record AdminUserAiUsagePageDto(
        List<AdminUserAiUsageDto> items,
        int page,
        int size,
        long totalElements,
        int totalPages
    ) {}
}
