package com.orbit.admin.service;

import com.orbit.admin.dto.AdminUserDetailDto;
import com.orbit.admin.dto.AdminUserSummaryDto;
import com.orbit.admin.dto.AdminUserWorkspaceDto;
import com.orbit.admin.dto.LinkedProviderDto;
import com.orbit.admin.dto.UserStatus;
import com.orbit.auth.entity.AccountStatus;
import com.orbit.auth.entity.UserEntity;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class AdminUserMapper {

    public AdminUserSummaryDto summary(UserEntity user, long workspaceCount) {
        return new AdminUserSummaryDto(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getEmail(),
            roleOf(user),
            statusOf(user),
            user.isTotpEnabled(),
            workspaceCount,
            user.getCreatedAt(),
            user.accountStatus().getDisabledAt()
        );
    }

    public AdminUserDetailDto detail(
        UserEntity user,
        long workspaceCount,
        String disabledByUsername,
        List<LinkedProviderDto> providers,
        List<AdminUserWorkspaceDto> workspaces
    ) {
        AccountStatus status = user.accountStatus();
        return new AdminUserDetailDto(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getEmail(),
            roleOf(user),
            statusOf(user),
            user.isTotpEnabled(),
            workspaceCount,
            user.getCreatedAt(),
            status.getDisabledAt(),
            status.getDisabledReason(),
            disabledByUsername,
            user.getCountry(),
            user.getOrganization(),
            user.getLocation(),
            user.getWebsite(),
            user.getBio(),
            providers,
            workspaces
        );
    }

    private static String roleOf(UserEntity user) {
        return user.getRole().toLowerCase(Locale.ROOT);
    }

    private static UserStatus statusOf(UserEntity user) {
        return user.isDisabled() ? UserStatus.DISABLED : UserStatus.ACTIVE;
    }
}
