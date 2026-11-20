package com.orbit.workspace.service;

import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.dto.WorkspaceDto;
import com.orbit.workspace.entity.WorkspaceEntity;
import com.orbit.workspace.repository.KeyCount;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import com.orbit.workspace.repository.WorkspaceModuleRepository;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Builds {@link WorkspaceDto}s with a fixed number of batched queries (no per-row fetches). */
@Component
public class WorkspaceAssembler {

    private final WorkspaceMemberRepository members;
    private final ProjectRepository projects;
    private final WorkspaceModuleRepository workspaceModules;

    public WorkspaceAssembler(
        WorkspaceMemberRepository members,
        ProjectRepository projects,
        WorkspaceModuleRepository workspaceModules
    ) {
        this.members = members;
        this.projects = projects;
        this.workspaceModules = workspaceModules;
    }

    public List<WorkspaceDto> assemble(UUID userId, List<WorkspaceEntity> workspaces) {
        if (workspaces.isEmpty()) return List.of();
        List<UUID> ids = workspaces.stream().map(WorkspaceEntity::getId).toList();

        Map<UUID, Long> memberCounts = KeyCount.toMap(members.countByWorkspaceIds(ids));
        Map<UUID, Long> projectCounts = KeyCount.toMap(projects.countActiveByWorkspaceIds(ids));
        Map<UUID, List<String>> modules = KeyValue.groupList(workspaceModules.findEnabledForWorkspaces(ids));
        Map<UUID, Set<String>> permissions = KeyValue.groupSet(members.findPermissionKeys(userId, ids));

        return workspaces.stream()
            .map(w -> new WorkspaceDto(
                w.getId(),
                w.getName(),
                w.getSlug(),
                w.getDescription(),
                w.getAvatarUrl(),
                w.getOwnerId(),
                memberCounts.getOrDefault(w.getId(), 0L),
                projectCounts.getOrDefault(w.getId(), 0L),
                modules.getOrDefault(w.getId(), List.of()),
                sorted(permissions.getOrDefault(w.getId(), Set.of())),
                w.getCreatedAt(),
                w.getUpdatedAt(),
                w.getDeletedAt(),
                w.getPurgeAfter()
            ))
            .toList();
    }

    public WorkspaceDto assembleOne(UUID userId, WorkspaceEntity workspace) {
        return assemble(userId, List.of(workspace)).getFirst();
    }

    static List<String> sorted(Collection<String> keys) {
        return keys.stream().sorted(Comparator.naturalOrder()).toList();
    }
}
