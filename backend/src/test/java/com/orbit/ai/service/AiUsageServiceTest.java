package com.orbit.ai.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.orbit.ai.dto.OpenRouterDtos.AiUsageSummaryDto;
import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.entity.AiUserOpenRouterKeyEntity;
import com.orbit.ai.gateway.OpenRouterClient;
import com.orbit.ai.repository.AiUsageLedgerRepository;
import com.orbit.ai.repository.AiUserOpenRouterKeyRepository;
import com.orbit.common.ApiException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiUsageServiceTest {

    @Mock
    private AiUsageLedgerRepository ledgerRepository;
    @Mock
    private AiUserOpenRouterKeyRepository userKeyRepository;
    @Mock
    private AiProviderConfigService configService;
    @Mock
    private OpenRouterClient openRouterClient;

    private AiSecretCipher cipher;
    private AiUsageService usageService;

    @BeforeEach
    void setUp() {
        cipher = new AiSecretCipher("unit-test-secret-key");
        usageService = new AiUsageService(ledgerRepository, userKeyRepository, configService, cipher, openRouterClient);
    }

    @Test
    void encryptsDecryptsAndMasksSecretsSafely() {
        String raw = "sk-or-v1-1234567890abcdef";
        String enc = cipher.encrypt(raw);
        assertNotEquals(raw, enc);
        assertEquals(raw, cipher.decrypt(enc));
        assertEquals("sk-or-...cdef", cipher.mask(raw));
        assertEquals("****", cipher.mask("short"));
    }

    @Test
    void blocksSystemKeyWhenMonthlyBudgetExceeded() {
        UUID userId = UUID.randomUUID();
        AiProviderConfigEntity cfg = new AiProviderConfigEntity();
        cfg.setDefaultMonthlyBudgetUsd(new BigDecimal("5.00"));
        when(userKeyRepository.findById(userId)).thenReturn(Optional.empty());
        when(configService.getActiveEntity()).thenReturn(cfg);
        when(ledgerRepository.sumCostByUserSince(eq(userId), any())).thenReturn(new BigDecimal("5.00"));

        ApiException ex = assertThrows(ApiException.class, () -> usageService.checkBudgetAndResolveKey(userId));
        assertEquals("AI_BUDGET_EXCEEDED", ex.getCode());
    }

    @Test
    void personalKeyBypassesSystemBudgetAndMasksInSummary() {
        UUID userId = UUID.randomUUID();
        AiUserOpenRouterKeyEntity keyEntity = new AiUserOpenRouterKeyEntity();
        keyEntity.setUserId(userId);
        keyEntity.setPersonalApiKeyEnc(cipher.encrypt("sk-or-v1-personal-9999"));
        AiProviderConfigEntity cfg = new AiProviderConfigEntity();
        cfg.setDefaultMonthlyBudgetUsd(new BigDecimal("10.00"));

        when(userKeyRepository.findById(userId)).thenReturn(Optional.of(keyEntity));
        AiUsageService.ResolvedKey resolved = usageService.checkBudgetAndResolveKey(userId);
        assertEquals("PERSONAL", resolved.keySource());
        assertEquals("sk-or-v1-personal-9999", resolved.apiKeyOverride());

        when(configService.getActiveEntity()).thenReturn(cfg);
        when(ledgerRepository.sumCostByUserSince(eq(userId), any())).thenReturn(new BigDecimal("2.50"));
        when(ledgerRepository.sumTotalCostByUser(userId)).thenReturn(new BigDecimal("4.00"));
        when(ledgerRepository.sumInputTokensByUserSince(eq(userId), any())).thenReturn(1000L);
        when(ledgerRepository.sumOutputTokensByUserSince(eq(userId), any())).thenReturn(500L);
        when(ledgerRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), any())).thenReturn(List.of());

        AiUsageSummaryDto summary = usageService.getMyUsageSummary(userId);
        assertTrue(summary.hasPersonalKey());
        assertEquals("sk-or-...9999", summary.personalKeyPreview());
        assertEquals(new BigDecimal("7.50"), summary.remainingBudgetUsd());
    }

    @Test
    void rejectsBlankPersonalKeyAndHandlesNullProvisioned() {
        UUID userId = UUID.randomUUID();
        ApiException ex = assertThrows(ApiException.class, () -> usageService.savePersonalKey(userId, "   "));
        assertEquals("INVALID_API_KEY", ex.getCode());

        AiProviderConfigEntity cfg = new AiProviderConfigEntity();
        cfg.setDefaultMonthlyBudgetUsd(new BigDecimal("10.00"));
        when(userKeyRepository.findById(userId)).thenReturn(Optional.empty());
        when(configService.getActiveEntity()).thenReturn(cfg);
        when(ledgerRepository.sumCostByUserSince(eq(userId), any())).thenReturn(BigDecimal.ZERO);

        AiUsageService.ResolvedKey resolved = usageService.checkBudgetAndResolveKey(userId);
        assertEquals("SYSTEM", resolved.keySource());
        assertNull(resolved.apiKeyOverride());
        assertFalse(resolved.keySource().isBlank());
    }
}
