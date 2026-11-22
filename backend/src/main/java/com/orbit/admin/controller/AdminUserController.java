package com.orbit.admin.controller;

import com.orbit.admin.dto.AdminUserDetailDto;
import com.orbit.admin.dto.AdminUserListQuery;
import com.orbit.admin.dto.AdminUserStatsDto;
import com.orbit.admin.dto.AdminUserSummaryDto;
import com.orbit.admin.dto.ChangeUserRoleRequest;
import com.orbit.admin.dto.DisableUserRequest;
import com.orbit.admin.service.AdminAccessGuard;
import com.orbit.admin.service.AdminUserCommandService;
import com.orbit.admin.service.AdminUserQueryService;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.PageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Platform administration of user accounts. Every call is re-checked against the database. */
@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private final AdminAccessGuard guard;
    private final AdminUserQueryService queries;
    private final AdminUserCommandService commands;

    public AdminUserController(
        AdminAccessGuard guard,
        AdminUserQueryService queries,
        AdminUserCommandService commands
    ) {
        this.guard = guard;
        this.queries = queries;
        this.commands = commands;
    }

    @GetMapping
    public PageResponse<AdminUserSummaryDto> list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String role,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String sort,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "25") int size
    ) {
        guard.requireAdmin(principal);
        return queries.list(new AdminUserListQuery(q, role, status, sort, page, size));
    }

    @GetMapping("/stats")
    public AdminUserStatsDto stats(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        guard.requireAdmin(principal);
        return queries.stats();
    }

    @GetMapping("/{userId}")
    public AdminUserDetailDto get(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID userId
    ) {
        guard.requireAdmin(principal);
        return queries.get(userId);
    }

    @PatchMapping("/{userId}/role")
    public AdminUserDetailDto changeRole(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID userId,
        @Valid @RequestBody ChangeUserRoleRequest request
    ) {
        UUID actorId = guard.requireAdmin(principal);
        return commands.changeRole(actorId, userId, request.role());
    }

    @PostMapping("/{userId}/disable")
    public AdminUserDetailDto disable(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID userId,
        @Valid @RequestBody(required = false) DisableUserRequest request
    ) {
        UUID actorId = guard.requireAdmin(principal);
        return commands.disable(actorId, userId, request == null ? null : request.reason());
    }

    @PostMapping("/{userId}/enable")
    public AdminUserDetailDto enable(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID userId
    ) {
        UUID actorId = guard.requireAdmin(principal);
        return commands.enable(actorId, userId);
    }

    @PostMapping("/{userId}/revoke-sessions")
    public ResponseEntity<Void> revokeSessions(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID userId
    ) {
        UUID actorId = guard.requireAdmin(principal);
        commands.revokeSessions(actorId, userId);
        return ResponseEntity.noContent().build();
    }
}
