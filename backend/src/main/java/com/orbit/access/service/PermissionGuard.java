package com.orbit.access.service;

import com.orbit.common.ApiException;
import com.orbit.workspace.entity.BaseRoleEntity;
import com.orbit.workspace.permission.SystemRole;
import java.util.Collection;
import java.util.Set;

/**
 * Anti-escalation rules: callers can never grant, or act on, more than they hold themselves.
 * The baseline system Member role is exempt, because every member already holds it.
 */
final class PermissionGuard {

    private PermissionGuard() {}

    static void requireCanGrant(Set<String> callerPermissions, Collection<String> granted) {
        if (!callerPermissions.containsAll(granted)) {
            throw ApiException.forbidden("FORBIDDEN", "You cannot grant permissions that you do not hold.");
        }
    }

    static void requireCanGrant(Set<String> callerPermissions, BaseRoleEntity role, Collection<String> granted) {
        if (!isBaseline(role)) {
            requireCanGrant(callerPermissions, granted);
        }
    }

    static void requireNotOutranked(
        Set<String> callerPermissions, BaseRoleEntity targetRole, Collection<String> targetPermissions
    ) {
        if (!isBaseline(targetRole) && !callerPermissions.containsAll(targetPermissions)) {
            throw ApiException.forbidden(
                "FORBIDDEN", "You cannot change a member who holds more permissions than you."
            );
        }
    }

    static boolean isBaseline(BaseRoleEntity role) {
        return role.isSystem() && !role.isImmutable() && SystemRole.MEMBER.displayName().equals(role.getName());
    }
}
