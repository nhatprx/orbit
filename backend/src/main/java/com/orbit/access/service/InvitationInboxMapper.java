package com.orbit.access.service;

import com.orbit.access.dto.InvitationDto;
import com.orbit.access.dto.InvitationInboxDto;
import com.orbit.access.entity.InvitationEntity;
import com.orbit.common.PageResponse;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.entity.WorkspaceEntity;
import com.orbit.workspace.repository.WorkspaceRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

@Component
class InvitationInboxMapper {
    private final WorkspaceRepository workspaces;
    private final ProjectRepository projects;
    private final InvitationMapper mapper;

    InvitationInboxMapper(WorkspaceRepository workspaces, ProjectRepository projects, InvitationMapper mapper) {
        this.workspaces = workspaces;
        this.projects = projects;
        this.mapper = mapper;
    }

    PageResponse<InvitationInboxDto> toResponse(Page<InvitationEntity> page) {
        List<InvitationEntity> items = page.getContent();
        Map<UUID, String> workspaceNames = names(workspaces.findAllById(
            items.stream().map(InvitationEntity::getWorkspaceId).collect(Collectors.toSet())
        ));
        Map<UUID, String> projectNames = names(projects.findAllById(
            items.stream().map(InvitationEntity::getProjectId).filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet())
        ));
        List<InvitationDto> mapped = mapper.toDtos(items);
        List<InvitationInboxDto> inbox = IntStream.range(0, items.size()).mapToObj(index -> {
            InvitationDto dto = mapped.get(index);
            return new InvitationInboxDto(dto.id(), dto.workspaceId(), workspaceNames.get(dto.workspaceId()),
                dto.projectId(), projectNames.get(dto.projectId()), dto.token(), dto.roleName(),
                dto.expiresAt(), dto.createdAt());
        }).toList();
        return PageResponse.from(page, inbox);
    }

    private static <T> Map<UUID, String> names(Iterable<T> entities) {
        Map<UUID, String> result = new HashMap<>();
        for (T entity : entities) {
            if (entity instanceof WorkspaceEntity workspace) result.put(workspace.getId(), workspace.getName());
            if (entity instanceof ProjectEntity project) result.put(project.getId(), project.getName());
        }
        return result;
    }
}
