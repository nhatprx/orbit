package com.orbit.issues.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.issues.dto.CreateSprintRequest;
import com.orbit.issues.dto.SprintDto;
import com.orbit.issues.dto.UpdateSprintRequest;
import com.orbit.issues.service.SprintService;
import jakarta.validation.Valid;
import java.util.List;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/sprints")
public class ProjectSprintController {

    private final SprintService sprints;

    public ProjectSprintController(SprintService sprints) {
        this.sprints = sprints;
    }

    @GetMapping
    public List<SprintDto> list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId
    ) {
        return sprints.listSprints(principal.userId(), workspaceId, projectId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SprintDto create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @Valid @RequestBody CreateSprintRequest request
    ) {
        return sprints.createSprint(principal.userId(), workspaceId, projectId, request);
    }

    @PatchMapping("/{sprintId}")
    public SprintDto update(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID sprintId,
        @Valid @RequestBody UpdateSprintRequest request
    ) {
        return sprints.updateSprint(principal.userId(), workspaceId, projectId, sprintId, request);
    }

    @DeleteMapping("/{sprintId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID sprintId
    ) {
        sprints.deleteSprint(principal.userId(), workspaceId, projectId, sprintId);
    }
}
