package com.orbit.admin.service;

import com.orbit.admin.dto.AdminUserDetailDto;
import com.orbit.admin.dto.AdminUserListQuery;
import com.orbit.admin.dto.AdminUserStatsDto;
import com.orbit.admin.dto.AdminUserSummaryDto;
import com.orbit.admin.dto.LinkedProviderDto;
import com.orbit.admin.dto.UserStatus;
import com.orbit.admin.repository.AdminUserQueries;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.OAuthAccountRepository;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import com.orbit.workspace.repository.KeyCount;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read side of admin user management: bounded, filtered pages plus per-user detail and totals. */
@Service
public class AdminUserQueryService {

    static final int MAX_TEXT_LENGTH = 100;
    private static final int MAX_WORKSPACES = 50;

    private final UserRepository users;
    private final AdminUserQueries queries;
    private final OAuthAccountRepository oauthAccounts;
    private final AdminUserMapper mapper;

    public AdminUserQueryService(
        UserRepository users,
        AdminUserQueries queries,
        OAuthAccountRepository oauthAccounts,
        AdminUserMapper mapper
    ) {
        this.users = users;
        this.queries = queries;
        this.oauthAccounts = oauthAccounts;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminUserSummaryDto> list(AdminUserListQuery query) {
        var spec = AdminUserSpecs.matching(
            normalizeText(query.q()), normalizeRole(query.role()), normalizeStatus(query.status())
        );
        var pageable = PageParams.of(query.page(), query.size(), AdminUserSort.parse(query.sort()));
        Page<UserEntity> page = users.findAll(spec, pageable);
        Map<UUID, Long> counts = workspaceCounts(page.getContent().stream().map(UserEntity::getId).toList());
        List<AdminUserSummaryDto> items = page.getContent().stream()
            .map(user -> mapper.summary(user, counts.getOrDefault(user.getId(), 0L)))
            .toList();
        return PageResponse.from(page, items);
    }

    @Transactional(readOnly = true)
    public AdminUserDetailDto get(UUID userId) {
        return detail(users.findById(userId).orElseThrow(AdminUserQueryService::notFound));
    }

    @Transactional(readOnly = true)
    public AdminUserDetailDto detail(UserEntity user) {
        long workspaceCount = workspaceCounts(List.of(user.getId())).getOrDefault(user.getId(), 0L);
        var workspaces = queries.findWorkspaces(user.getId(), PageRequest.of(0, MAX_WORKSPACES));
        List<LinkedProviderDto> providers = oauthAccounts.findByUserIdOrderByCreatedAtAsc(user.getId())
            .stream().map(LinkedProviderDto::from).toList();
        UUID disabledBy = user.accountStatus().getDisabledBy();
        String disabledByUsername = disabledBy == null
            ? null
            : users.findById(disabledBy).map(UserEntity::getUsername).orElse(null);
        return mapper.detail(user, workspaceCount, disabledByUsername, providers, workspaces);
    }

    @Transactional(readOnly = true)
    public AdminUserStatsDto stats() {
        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        return new AdminUserStatsDto(
            users.count(),
            users.countByRoleIgnoreCase(AdminAccessGuard.ADMIN_ROLE),
            users.countDisabled(),
            users.countByCreatedAtGreaterThanEqual(weekAgo)
        );
    }

    static ApiException notFound() {
        return ApiException.notFound("USER_NOT_FOUND", "User not found.");
    }

    private Map<UUID, Long> workspaceCounts(Collection<UUID> userIds) {
        if (userIds.isEmpty()) return Map.of();
        List<KeyCount> rows = queries.countActiveWorkspaces(userIds);
        return KeyCount.toMap(rows);
    }

    private static String normalizeText(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String text = raw.trim();
        if (text.length() > MAX_TEXT_LENGTH) {
            throw ApiException.badRequest(
                "VALIDATION_ERROR", "Search text must be at most " + MAX_TEXT_LENGTH + " characters."
            );
        }
        return text;
    }

    private static String normalizeRole(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String role = raw.trim().toLowerCase(Locale.ROOT);
        if (!role.equals("user") && !role.equals(AdminAccessGuard.ADMIN_ROLE)) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Role filter must be user or admin.");
        }
        return role;
    }

    private static UserStatus normalizeStatus(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return UserStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Status filter must be active or disabled.");
        }
    }
}
