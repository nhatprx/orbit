package com.orbit.project.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import com.orbit.project.dto.CreateProjectRequest;
import com.orbit.project.dto.ProjectDto;
import com.orbit.project.dto.UpdateProjectRequest;
import com.orbit.project.service.ProjectService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ProjectController {

    private final ProjectService projects;

    public ProjectController(ProjectService projects) {
        this.projects = projects;
    }

    @GetMapping("/projects/mine")
    public PageResponse<ProjectDto> listMine(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "" + PageParams.DEFAULT_SIZE) int size
    ) {
        return projects.listMine(principal.userId(), page, size);
    }

    @GetMapping("/workspaces/{workspaceId}/projects")
    public PageResponse<ProjectDto> list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "" + PageParams.DEFAULT_SIZE) int size
    ) {
        return projects.list(principal.userId(), workspaceId, page, size);
    }

    @PostMapping("/workspaces/{workspaceId}/projects")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectDto create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @Valid @RequestBody CreateProjectRequest request
    ) {
        return projects.create(principal.userId(), workspaceId, request);
    }

    @GetMapping("/workspaces/{workspaceId}/projects/{projectId}")
    public ProjectDto get(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId
    ) {
        return projects.get(principal.userId(), workspaceId, projectId);
    }

    @PatchMapping("/workspaces/{workspaceId}/projects/{projectId}")
    public ProjectDto update(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @Valid @RequestBody UpdateProjectRequest request
    ) {
        return projects.update(principal.userId(), workspaceId, projectId, request);
    }

    @DeleteMapping("/workspaces/{workspaceId}/projects/{projectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId
    ) {
        projects.delete(principal.userId(), workspaceId, projectId);
    }
}
