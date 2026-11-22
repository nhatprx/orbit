package com.orbit.admin.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Admin access is decided from the database, never from the role claim inside the token: a demoted
 * or disabled administrator loses access on the very next request, even with an unexpired token.
 */
@Component
public class AdminAccessGuard {

    static final String ADMIN_ROLE = "admin";

    private final UserRepository users;

    public AdminAccessGuard(UserRepository users) {
        this.users = users;
    }

    /** Returns the id of the verified, active administrator behind this request. */
    public UUID requireAdmin(AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw unauthorized();
        }
        UserEntity user = users.findById(principal.userId()).orElseThrow(AdminAccessGuard::unauthorized);
        if (!ADMIN_ROLE.equalsIgnoreCase(user.getRole()) || user.isDisabled()) {
            throw ApiException.forbidden("ADMIN_REQUIRED", "Admin role is required.");
        }
        return user.getId();
    }

    private static ApiException unauthorized() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
    }
}
