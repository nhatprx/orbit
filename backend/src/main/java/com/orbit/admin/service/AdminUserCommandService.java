package com.orbit.admin.service;

import com.orbit.admin.dto.AdminUserDetailDto;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.service.JwtService;
import com.orbit.auth.service.RedisSessionService;
import com.orbit.common.ApiException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Write side of admin user management. Invariants: an administrator never acts on their own
 * account, and at least one active administrator always remains (removals lock the admin rows).
 */
@Service
public class AdminUserCommandService {

    private static final Logger LOG = LoggerFactory.getLogger(AdminUserCommandService.class);
    private static final String USER_ROLE = "user";
    private static final int MAX_REASON_LENGTH = 255;

    private final UserRepository users;
    private final RedisSessionService sessions;
    private final JwtService jwtService;
    private final AdminUserQueryService queries;

    public AdminUserCommandService(
        UserRepository users,
        RedisSessionService sessions,
        JwtService jwtService,
        AdminUserQueryService queries
    ) {
        this.users = users;
        this.sessions = sessions;
        this.jwtService = jwtService;
        this.queries = queries;
    }

    /** Changing a role also signs the user out, so a fresh token carries the new role. */
    @Transactional
    public AdminUserDetailDto changeRole(UUID actorId, UUID targetId, String role) {
        requireNotSelf(actorId, targetId);
        String next = normalizeRole(role);
        UserEntity target = load(targetId);
        if (next.equals(target.getRole().toLowerCase(Locale.ROOT))) {
            return queries.detail(target);
        }
        if (isActiveAdmin(target)) {
            requireAnotherActiveAdmin(targetId);
        }
        target.setRole(next);
        users.save(target);
        endSessions(targetId);
        audit(actorId, "role_change:" + next, targetId);
        return queries.detail(target);
    }

    /** Disabling is idempotent and always ends the user's sessions. */
    @Transactional
    public AdminUserDetailDto disable(UUID actorId, UUID targetId, String reason) {
        requireNotSelf(actorId, targetId);
        UserEntity target = load(targetId);
        if (!target.isDisabled()) {
            if (isActiveAdmin(target)) {
                requireAnotherActiveAdmin(targetId);
            }
            // Microseconds are all PostgreSQL stores, so the response matches what a later read returns.
            target.accountStatus().disable(actorId, cleanReason(reason), Instant.now().truncatedTo(ChronoUnit.MICROS));
            users.save(target);
            audit(actorId, "disable", targetId);
        }
        endSessions(targetId);
        return queries.detail(target);
    }

    @Transactional
    public AdminUserDetailDto enable(UUID actorId, UUID targetId) {
        UserEntity target = load(targetId);
        if (target.isDisabled()) {
            target.accountStatus().enable();
            users.save(target);
            audit(actorId, "enable", targetId);
        }
        return queries.detail(target);
    }

    @Transactional
    public void revokeSessions(UUID actorId, UUID targetId) {
        requireNotSelf(actorId, targetId);
        load(targetId);
        endSessions(targetId);
        audit(actorId, "revoke_sessions", targetId);
    }

    private UserEntity load(UUID userId) {
        return users.findById(userId).orElseThrow(AdminUserQueryService::notFound);
    }

    private void endSessions(UUID userId) {
        sessions.revokeAllSessions(userId, jwtService.getRememberMeExpirationSeconds());
    }

    private static boolean isActiveAdmin(UserEntity user) {
        return AdminAccessGuard.ADMIN_ROLE.equalsIgnoreCase(user.getRole()) && !user.isDisabled();
    }

    private void requireAnotherActiveAdmin(UUID removedId) {
        boolean another = users.lockActiveAdmins().stream().anyMatch(admin -> !admin.getId().equals(removedId));
        if (!another) {
            throw ApiException.conflict("LAST_ADMIN", "At least one active administrator must remain.");
        }
    }

    private static void requireNotSelf(UUID actorId, UUID targetId) {
        if (actorId.equals(targetId)) {
            throw ApiException.conflict(
                "SELF_ACTION_NOT_ALLOWED", "You cannot perform this action on your own account."
            );
        }
    }

    private static String normalizeRole(String raw) {
        String role = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (!role.equals(USER_ROLE) && !role.equals(AdminAccessGuard.ADMIN_ROLE)) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Role must be user or admin.");
        }
        return role;
    }

    private static String cleanReason(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String reason = raw.trim();
        if (reason.length() > MAX_REASON_LENGTH) {
            throw ApiException.badRequest(
                "VALIDATION_ERROR", "Reason must be at most " + MAX_REASON_LENGTH + " characters."
            );
        }
        return reason;
    }

    private static void audit(UUID actorId, String action, UUID targetId) {
        LOG.info("Admin action: actor={} action={} target={}", actorId, action, targetId);
    }
}
