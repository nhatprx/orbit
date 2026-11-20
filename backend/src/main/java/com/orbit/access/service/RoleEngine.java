package com.orbit.access.service;

import com.orbit.access.dto.CreateRoleRequest;
import com.orbit.access.dto.RoleDto;
import com.orbit.access.dto.UpdateRoleRequest;
import com.orbit.common.ApiException;
import com.orbit.workspace.entity.BaseRoleEntity;
import com.orbit.workspace.entity.RolePermissionEntity;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.repository.RolePermissionRepository;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Scope-agnostic custom-role rules: BR-06, BR-11 and the anti-escalation guard. */
@Component
class RoleEngine {

    private final RolePermissionRepository rolePermissions;

    RoleEngine(RolePermissionRepository rolePermissions) {
        this.rolePermissions = rolePermissions;
    }

    @Transactional(readOnly = true)
    List<RoleDto> list(RoleScopeOps ops, UUID ownerId) {
        List<BaseRoleEntity> roles = ops.list(ownerId);
        List<UUID> ids = roles.stream().map(BaseRoleEntity::getId).toList();
        Map<UUID, List<String>> keys = KeyValue.groupList(rolePermissions.findKeysForRoles(ids, ops.scope()));
        Map<UUID, Long> counts = ops.memberCounts(ids);
        return roles.stream()
            .map(r -> toDto(ops, r, keys.getOrDefault(r.getId(), List.of()), counts.getOrDefault(r.getId(), 0L)))
            .toList();
    }

    @Transactional
    RoleDto create(RoleScopeOps ops, UUID ownerId, Set<String> callerPermissions, CreateRoleRequest request) {
        String name = cleanName(request.name());
        Set<String> keys = cleanKeys(ops, request.permissions());
        PermissionGuard.requireCanGrant(callerPermissions, keys);
        if (ops.nameTaken(ownerId, name)) {
            throw ApiException.conflict("ROLE_NAME_TAKEN", "A role with this name already exists.");
        }
        BaseRoleEntity role = ops.create(ownerId, name);
        addKeys(ops, role.getId(), keys);
        return toDto(ops, role, List.copyOf(keys), 0);
    }

    @Transactional
    RoleDto update(
        RoleScopeOps ops, UUID ownerId, UUID roleId, Set<String> callerPermissions, UpdateRoleRequest request
    ) {
        BaseRoleEntity role = require(ops, ownerId, roleId);
        if (role.isImmutable()) {
            throw ApiException.forbidden("SYSTEM_ROLE_IMMUTABLE", "The Owner role cannot be modified.");
        }
        if (request.name() != null) {
            String name = cleanName(request.name());
            if (!name.equals(role.getName())) {
                if (role.isSystem()) {
                    throw ApiException.forbidden("SYSTEM_ROLE_IMMUTABLE", "System role names cannot be changed.");
                }
                if (!name.equalsIgnoreCase(role.getName()) && ops.nameTaken(ownerId, name)) {
                    throw ApiException.conflict("ROLE_NAME_TAKEN", "A role with this name already exists.");
                }
                role.setName(name);
                ops.save(role);
            }
        }
        Set<String> current = rolePermissions.findKeys(roleId, ops.scope());
        if (request.permissions() != null) {
            Set<String> wanted = cleanKeys(ops, request.permissions());
            Set<String> added = difference(wanted, current);
            PermissionGuard.requireCanGrant(callerPermissions, added);
            Set<String> removed = difference(current, wanted);
            if (!removed.isEmpty()) {
                rolePermissions.deleteForRoleAndKeys(roleId, ops.scope(), removed);
            }
            addKeys(ops, roleId, added);
            current = wanted;
        }
        long members = ops.memberCounts(List.of(roleId)).getOrDefault(roleId, 0L);
        return toDto(ops, role, List.copyOf(current), members);
    }

    @Transactional
    void delete(RoleScopeOps ops, UUID ownerId, UUID roleId) {
        BaseRoleEntity role = require(ops, ownerId, roleId);
        if (role.isSystem()) {
            throw ApiException.forbidden("SYSTEM_ROLE_IMMUTABLE", "System roles cannot be deleted.");
        }
        if (ops.memberCounts(List.of(roleId)).getOrDefault(roleId, 0L) > 0) {
            throw ApiException.conflict("ROLE_IN_USE", "Reassign the members of this role before deleting it.");
        }
        rolePermissions.deleteForRole(roleId, ops.scope());
        ops.delete(role);
    }

    private BaseRoleEntity require(RoleScopeOps ops, UUID ownerId, UUID roleId) {
        return ops.find(ownerId, roleId)
            .orElseThrow(() -> ApiException.notFound("ROLE_NOT_FOUND", "Role not found."));
    }

    private void addKeys(RoleScopeOps ops, UUID roleId, Collection<String> keys) {
        if (keys.isEmpty()) return;
        rolePermissions.saveAll(keys.stream().map(k -> new RolePermissionEntity(roleId, ops.scope(), k)).toList());
    }

    private static String cleanName(String raw) {
        String name = raw == null ? "" : raw.trim();
        if (name.isEmpty() || name.length() > 50) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Role name must be 1 to 50 characters.");
        }
        return name;
    }

    private static Set<String> cleanKeys(RoleScopeOps ops, Collection<String> raw) {
        Set<String> keys = new LinkedHashSet<>();
        for (String key : raw == null ? List.<String>of() : raw) {
            if (!ops.isValidKey(key)) {
                throw ApiException.badRequest("VALIDATION_ERROR", "Unknown permission key.");
            }
            keys.add(key);
        }
        return keys;
    }

    private static Set<String> difference(Set<String> left, Set<String> right) {
        Set<String> result = new LinkedHashSet<>(left);
        result.removeAll(right);
        return result;
    }

    private static RoleDto toDto(RoleScopeOps ops, BaseRoleEntity role, List<String> keys, long memberCount) {
        return new RoleDto(
            role.getId(),
            ops.scope().name(),
            role.getName(),
            role.isSystem(),
            role.isImmutable(),
            keys.stream().sorted(Comparator.naturalOrder()).toList(),
            memberCount,
            role.getCreatedAt()
        );
    }
}
