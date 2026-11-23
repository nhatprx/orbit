package com.orbit.ai.service;

import com.orbit.ai.dto.OpenRouterDtos.AiUsageEntryDto;
import com.orbit.ai.dto.OpenRouterDtos.AiUsageSummaryDto;
import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.entity.AiUsageLedgerEntity;
import com.orbit.ai.entity.AiUserOpenRouterKeyEntity;
import com.orbit.ai.gateway.OpenRouterClient;
import com.orbit.ai.repository.AiUsageLedgerRepository;
import com.orbit.ai.repository.AiUserOpenRouterKeyRepository;
import com.orbit.common.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiUsageService {

    public record ResolvedKey(String apiKeyOverride, String keySource) {}

    private final AiUsageLedgerRepository ledgerRepository;
    private final AiUserOpenRouterKeyRepository userKeyRepository;
    private final AiProviderConfigService configService;
    private final AiSecretCipher secretCipher;
    private final OpenRouterClient openRouterClient;

    public AiUsageService(
        AiUsageLedgerRepository ledgerRepository,
        AiUserOpenRouterKeyRepository userKeyRepository,
        AiProviderConfigService configService,
        AiSecretCipher secretCipher,
        OpenRouterClient openRouterClient
    ) {
        this.ledgerRepository = ledgerRepository;
        this.userKeyRepository = userKeyRepository;
        this.configService = configService;
        this.secretCipher = secretCipher;
        this.openRouterClient = openRouterClient;
    }

    public ResolvedKey checkBudgetAndResolveKey(UUID userId) {
        AiUserOpenRouterKeyEntity userKey = userKeyRepository.findById(userId).orElse(null);
        if (userKey != null && userKey.getPersonalApiKeyEnc() != null && !userKey.getPersonalApiKeyEnc().isBlank()) {
            return new ResolvedKey(secretCipher.decrypt(userKey.getPersonalApiKeyEnc()), "PERSONAL");
        }
        BigDecimal budget = resolveMonthlyBudget(userKey);
        if (budget.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal spent = ledgerRepository.sumCostByUserSince(userId, startOfCurrentMonthUtc());
            if (spent.compareTo(budget) >= 0) {
                throw new ApiException(
                    HttpStatus.PAYMENT_REQUIRED,
                    "AI_BUDGET_EXCEEDED",
                    "Monthly AI budget exceeded ($" + spent.toPlainString() + " / $" + budget.toPlainString() + ")."
                );
            }
        }
        if (userKey != null && userKey.getProvisionedKeyEnc() != null && !userKey.getProvisionedKeyEnc().isBlank()) {
            return new ResolvedKey(secretCipher.decrypt(userKey.getProvisionedKeyEnc()), "PROVISIONED");
        }
        return new ResolvedKey(null, "SYSTEM");
    }

    @Transactional
    public void recordUsage(
        UUID userId, UUID threadId, UUID messageId, String providerUsed,
        String modelUsed, String generationId, int inputTokens, int outputTokens,
        BigDecimal costUsd, String keySource
    ) {
        AiUsageLedgerEntity entry = new AiUsageLedgerEntity();
        entry.setId(UUID.randomUUID());
        entry.setUserId(userId);
        entry.setThreadId(threadId);
        entry.setMessageId(messageId);
        entry.setProviderUsed(providerUsed);
        entry.setModelUsed(modelUsed);
        entry.setGenerationId(generationId);
        entry.setInputTokens(inputTokens);
        entry.setOutputTokens(outputTokens);
        entry.setCostUsd(costUsd != null ? costUsd : BigDecimal.ZERO);
        entry.setKeySource(keySource != null ? keySource : "SYSTEM");
        ledgerRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public AiUsageSummaryDto getMyUsageSummary(UUID userId) {
        Instant since = startOfCurrentMonthUtc();
        AiUserOpenRouterKeyEntity userKey = userKeyRepository.findById(userId).orElse(null);
        BigDecimal monthCost = ledgerRepository.sumCostByUserSince(userId, since);
        BigDecimal totalCost = ledgerRepository.sumTotalCostByUser(userId);
        BigDecimal budget = resolveMonthlyBudget(userKey);
        BigDecimal remaining = budget.subtract(monthCost).max(BigDecimal.ZERO);
        long inTok = ledgerRepository.sumInputTokensByUserSince(userId, since);
        long outTok = ledgerRepository.sumOutputTokensByUserSince(userId, since);
        String personalPlain = userKey != null ? secretCipher.decrypt(userKey.getPersonalApiKeyEnc()) : null;
        boolean hasPersonal = personalPlain != null && !personalPlain.isBlank();
        boolean hasProvisioned = userKey != null && userKey.getProvisionedKeyEnc() != null && !userKey.getProvisionedKeyEnc().isBlank();
        String keySource = hasPersonal ? "PERSONAL" : hasProvisioned ? "PROVISIONED" : "SYSTEM";
        List<AiUsageEntryDto> recent = ledgerRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 20))
            .stream().map(e -> new AiUsageEntryDto(
                e.getId().toString(), e.getThreadId() != null ? e.getThreadId().toString() : null,
                e.getModelUsed(), e.getProviderUsed(), e.getInputTokens(), e.getOutputTokens(),
                e.getCostUsd(), e.getKeySource(), e.getCreatedAt() != null ? e.getCreatedAt().toString() : null
            )).toList();
        return new AiUsageSummaryDto(
            monthCost, totalCost, budget, remaining, inTok, outTok,
            keySource, hasPersonal, secretCipher.mask(personalPlain), hasProvisioned, recent
        );
    }

    @Transactional
    public AiUsageSummaryDto connectOAuthKey(UUID userId, String code, String codeVerifier) {
        String apiKey = openRouterClient.exchangeOAuthCode(code, codeVerifier);
        savePersonalKey(userId, apiKey);
        return getMyUsageSummary(userId);
    }

    @Transactional
    public AiUsageSummaryDto savePersonalKey(UUID userId, String rawApiKey) {
        if (rawApiKey == null || rawApiKey.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_API_KEY", "API key is required.");
        }
        AiUserOpenRouterKeyEntity entity = userKeyRepository.findById(userId).orElseGet(() -> {
            AiUserOpenRouterKeyEntity e = new AiUserOpenRouterKeyEntity();
            e.setUserId(userId);
            return e;
        });
        entity.setPersonalApiKeyEnc(secretCipher.encrypt(rawApiKey));
        userKeyRepository.save(entity);
        return getMyUsageSummary(userId);
    }

    @Transactional
    public AiUsageSummaryDto clearPersonalKey(UUID userId) {
        userKeyRepository.findById(userId).ifPresent(entity -> {
            entity.setPersonalApiKeyEnc(null);
            userKeyRepository.save(entity);
        });
        return getMyUsageSummary(userId);
    }

    public static Instant startOfCurrentMonthUtc() {
        return YearMonth.now(ZoneOffset.UTC).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
    }

    private BigDecimal resolveMonthlyBudget(AiUserOpenRouterKeyEntity userKey) {
        if (userKey != null && userKey.getMonthlyBudgetUsd() != null) {
            return userKey.getMonthlyBudgetUsd();
        }
        AiProviderConfigEntity cfg = configService.getActiveEntity();
        return cfg.getDefaultMonthlyBudgetUsd() != null ? cfg.getDefaultMonthlyBudgetUsd() : new BigDecimal("10.00");
    }
}
