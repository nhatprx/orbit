package com.orbit.project.service;

import com.orbit.project.dto.ProjectDto;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.project.repository.ProjectMemberRepository;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.workspace.entity.WorkspaceEntity;
import com.orbit.workspace.permission.ProjectPermissionPolicy;
import com.orbit.workspace.repository.KeyCount;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import com.orbit.workspace.repository.WorkspaceRepository;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Builds {@link ProjectDto}s with a fixed number of batched queries (no per-row fetches). */
@Component
public class ProjectAssembler {

    private final WorkspaceRepository workspaces;
    private final WorkspaceMemberRepository workspaceMembers;
    private final ProjectMemberRepository projectMembers;
    private final ProjectModuleRepository projectModules;

    public ProjectAssembler(
        WorkspaceRepository workspaces,
        WorkspaceMemberRepository workspaceMembers,
        ProjectMemberRepository projectMembers,
        ProjectModuleRepository projectModules
    ) {
        this.workspaces = workspaces;
        this.workspaceMembers = workspaceMembers;
        this.projectMembers = projectMembers;
        this.projectModules = projectModules;
    }

    public List<ProjectDto> assemble(UUID userId, List<ProjectEntity> projects) {
        if (projects.isEmpty()) return List.of();
        List<UUID> projectIds = projects.stream().map(ProjectEntity::getId).toList();
        Set<UUID> workspaceIds = projects.stream().map(ProjectEntity::getWorkspaceId).collect(Collectors.toSet());

        Map<UUID, WorkspaceEntity> workspaceById = workspaces.findAllById(workspaceIds).stream()
            .collect(Collectors.toMap(WorkspaceEntity::getId, Function.identity()));
        Map<UUID, Set<String>> workspacePerms =
            KeyValue.groupSet(workspaceMembers.findPermissionKeys(userId, workspaceIds));
        Set<UUID> memberOf = new HashSet<>(projectMembers.findMemberProjectIds(userId, projectIds));
        Map<UUID, Set<String>> explicit = KeyValue.groupSet(projectMembers.findPermissionKeys(userId, projectIds));
        Map<UUID, Long> counts = KeyCount.toMap(projectMembers.countByProjectIds(projectIds));
        Map<UUID, List<String>> modules = KeyValue.groupList(projectModules.findEffectiveEnabled(projectIds));

        return projects.stream().map(p -> {
            WorkspaceEntity workspace = workspaceById.get(p.getWorkspaceId());
            Set<String> effective = ProjectPermissionPolicy.effective(
                workspacePerms.getOrDefault(workspace.getId(), Set.of()),
                userId.equals(workspace.getOwnerId()),
                memberOf.contains(p.getId()),
                explicit.getOrDefault(p.getId(), Set.of())
            );
            return new ProjectDto(
                p.getId(),
                workspace.getId(),
                workspace.getName(),
                p.getName(),
                p.getSlug(),
                p.getDescription(),
                counts.getOrDefault(p.getId(), 0L),
                modules.getOrDefault(p.getId(), List.of()),
                effective.stream().sorted(Comparator.naturalOrder()).toList(),
                p.getCreatedAt(),
                p.getUpdatedAt()
            );
        }).toList();
    }

    public ProjectDto assembleOne(UUID userId, ProjectEntity project) {
        return assemble(userId, List.of(project)).getFirst();
    }
}
