package com.orbit.access.service;

import com.orbit.access.dto.InvitationDto;
import com.orbit.access.entity.InvitationEntity;
import com.orbit.common.Timestamps;
import com.orbit.project.repository.ProjectRoleRepository;
import com.orbit.workspace.permission.SystemRole;
import com.orbit.workspace.repository.WorkspaceRoleRepository;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Maps invitations to DTOs, resolving role names in two batched lookups. */
@Component
class InvitationMapper {

    private final WorkspaceRoleRepository workspaceRoles;
    private final ProjectRoleRepository projectRoles;

    InvitationMapper(WorkspaceRoleRepository workspaceRoles, ProjectRoleRepository projectRoles) {
        this.workspaceRoles = workspaceRoles;
        this.projectRoles = projectRoles;
    }

    List<InvitationDto> toDtos(List<InvitationEntity> items) {
        Map<UUID, String> names = roleNames(items);
        Instant now = Timestamps.now();
        return items.stream()
            .map(i -> new InvitationDto(
                i.getId(),
                i.getWorkspaceId(),
                i.getProjectId(),
                i.getType().name(),
                i.getEmail(),
                i.getToken(),
                i.getRoleId(),
                names.getOrDefault(i.getRoleId(), SystemRole.MEMBER.displayName()),
                i.effectiveStatus(now).name(),
                i.getExpiresAt(),
                i.getCreatedAt()
            ))
            .toList();
    }

    InvitationDto toDto(InvitationEntity item) {
        return toDtos(List.of(item)).getFirst();
    }

    String roleName(InvitationEntity item) {
        return roleNames(List.of(item)).getOrDefault(item.getRoleId(), SystemRole.MEMBER.displayName());
    }

    private Map<UUID, String> roleNames(List<InvitationEntity> items) {
        Set<UUID> workspaceRoleIds = items.stream()
            .filter(i -> i.getProjectId() == null)
            .map(InvitationEntity::getRoleId)
            .collect(Collectors.toSet());
        Set<UUID> projectRoleIds = items.stream()
            .filter(i -> i.getProjectId() != null)
            .map(InvitationEntity::getRoleId)
            .collect(Collectors.toSet());

        Map<UUID, String> names = new HashMap<>();
        if (!workspaceRoleIds.isEmpty()) {
            workspaceRoles.findAllByIds(workspaceRoleIds).forEach(r -> names.put(r.getId(), r.getName()));
        }
        if (!projectRoleIds.isEmpty()) {
            projectRoles.findAllByIds(projectRoleIds).forEach(r -> names.put(r.getId(), r.getName()));
        }
        return names;
    }
}
