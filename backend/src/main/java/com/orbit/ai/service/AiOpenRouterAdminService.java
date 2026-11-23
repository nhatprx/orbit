package com.orbit.ai.service;

import com.orbit.ai.dto.OpenRouterDtos.AdminUserAiUsageDto;
import com.orbit.ai.dto.OpenRouterDtos.AdminUserAiUsagePageDto;
import com.orbit.ai.dto.OpenRouterDtos.OpenRouterCreditsDto;
import com.orbit.ai.dto.OpenRouterDtos.ProvisionedKeyResult;
import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.entity.AiUserOpenRouterKeyEntity;
import com.orbit.ai.gateway.OpenRouterClient;
import com.orbit.ai.repository.AiUsageLedgerRepository;
import com.orbit.ai.repository.AiUserOpenRouterKeyRepository;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiOpenRouterAdminService {

    private final AiProviderConfigService configService;
    private final AiSecretCipher secretCipher;
    private final OpenRouterClient openRouterClient;
    private final AiUsageLedgerRepository ledgerRepository;
    private final AiUserOpenRouterKeyRepository userKeyRepository;
    private final UserRepository userRepository;

    public AiOpenRouterAdminService(
        AiProviderConfigService configService,
        AiSecretCipher secretCipher,
        OpenRouterClient openRouterClient,
        AiUsageLedgerRepository ledgerRepository,
        AiUserOpenRouterKeyRepository userKeyRepository,
        UserRepository userRepository
    ) {
        this.configService = configService;
        this.secretCipher = secretCipher;
        this.openRouterClient = openRouterClient;
        this.ledgerRepository = ledgerRepository;
        this.userKeyRepository = userKeyRepository;
        this.userRepository = userRepository;
    }

    public OpenRouterCreditsDto getAccountCredits() {
        String mgmtKey = requireManagementKey();
        return openRouterClient.fetchCredits(mgmtKey);
    }

    @Transactional(readOnly = true)
    public AdminUserAiUsagePageDto listUserUsage(int page, int size, String search) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(50, size));
        AiProviderConfigEntity cfg = configService.getActiveEntity();
        BigDecimal defaultBudget = cfg.getDefaultMonthlyBudgetUsd();

        Instant monthStart = AiUsageService.startOfCurrentMonthUtc();
        Map<UUID, Object[]> usageByUser = new HashMap<>();
        for (Object[] row : ledgerRepository.summarizeByUserSince(monthStart)) {
            usageByUser.put((UUID) row[0], row);
        }
        Map<UUID, List<String>> modelsByUser = new HashMap<>();
        for (Object[] row : ledgerRepository.listModelsByUserSince(monthStart)) {
            UUID uid = (UUID) row[0];
            String model = (String) row[1];
            if (model != null && !model.isBlank()) {
                modelsByUser.computeIfAbsent(uid, ignored -> new ArrayList<>()).add(model);
            }
        }
        Map<UUID, AiUserOpenRouterKeyEntity> keysByUser = new HashMap<>();
        for (AiUserOpenRouterKeyEntity k : userKeyRepository.findAll()) {
            keysByUser.put(k.getUserId(), k);
        }

        String q = search != null ? search.trim().toLowerCase() : "";
        List<UserEntity> allUsers;
        long totalElements;
        int totalPages;
        if (q.isEmpty()) {
            Page<UserEntity> userPage = userRepository.findAll(PageRequest.of(safePage, safeSize, Sort.by("createdAt").descending()));
            allUsers = userPage.getContent();
            totalElements = userPage.getTotalElements();
            totalPages = Math.max(1, userPage.getTotalPages());
        } else {
            List<UserEntity> filtered = userRepository.findAll(Sort.by("createdAt").descending()).stream()
                .filter(u -> u.getDisplayName().toLowerCase().contains(q) || u.getEmail().toLowerCase().contains(q))
                .toList();
            totalElements = filtered.size();
            totalPages = Math.max(1, (int) Math.ceil((double) totalElements / safeSize));
            int from = Math.min(safePage * safeSize, filtered.size());
            int to = Math.min(from + safeSize, filtered.size());
            allUsers = filtered.subList(from, to);
        }

        List<AdminUserAiUsageDto> items = allUsers.stream().map(u -> {
            Object[] agg = usageByUser.get(u.getId());
            BigDecimal cost = agg != null ? (BigDecimal) agg[1] : BigDecimal.ZERO;
            long tokens = agg != null ? ((Number) agg[2]).longValue() : 0L;
            long count = agg != null ? ((Number) agg[3]).longValue() : 0L;
            AiUserOpenRouterKeyEntity k = keysByUser.get(u.getId());
            BigDecimal budget = k != null && k.getMonthlyBudgetUsd() != null ? k.getMonthlyBudgetUsd() : defaultBudget;
            boolean hasProv = k != null && k.getProvisionedKeyEnc() != null && !k.getProvisionedKeyEnc().isBlank();
            boolean hasPers = k != null && k.getPersonalApiKeyEnc() != null && !k.getPersonalApiKeyEnc().isBlank();
            return new AdminUserAiUsageDto(
                u.getId().toString(), u.getDisplayName(), u.getEmail(),
                cost, tokens, count, budget, hasProv, hasPers,
                modelsByUser.getOrDefault(u.getId(), List.of())
            );
        }).toList();
        return new AdminUserAiUsagePageDto(items, safePage, safeSize, totalElements, totalPages);
    }

    @Transactional
    public void updateUserBudget(UUID userId, BigDecimal monthlyBudgetUsd, boolean provisionSubKey) {
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found.")
        );
        AiUserOpenRouterKeyEntity entity = userKeyRepository.findById(userId).orElseGet(() -> {
            AiUserOpenRouterKeyEntity e = new AiUserOpenRouterKeyEntity();
            e.setUserId(userId);
            return e;
        });
        entity.setMonthlyBudgetUsd(monthlyBudgetUsd);
        if (provisionSubKey) {
            String mgmtKey = requireManagementKey();
            if (entity.getProvisionedKeyHash() != null && !entity.getProvisionedKeyHash().isBlank()) {
                openRouterClient.updateKeyLimit(mgmtKey, entity.getProvisionedKeyHash(), monthlyBudgetUsd);
            } else {
                String label = "orbit-" + user.getEmail();
                ProvisionedKeyResult created = openRouterClient.createKey(mgmtKey, label, monthlyBudgetUsd);
                entity.setProvisionedKeyEnc(secretCipher.encrypt(created.key()));
                entity.setProvisionedKeyHash(created.hash());
            }
        }
        userKeyRepository.save(entity);
    }

    private String requireManagementKey() {
        String mgmtEnc = configService.getActiveEntity().getOpenrouterMgmtKeyEnc();
        String mgmtKey = secretCipher.decrypt(mgmtEnc);
        if (mgmtKey == null || mgmtKey.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OPENROUTER_MGMT_KEY_REQUIRED", "OpenRouter Management API key is not configured.");
        }
        return mgmtKey;
    }
}
