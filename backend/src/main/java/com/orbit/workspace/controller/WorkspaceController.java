package com.orbit.workspace.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import com.orbit.workspace.dto.CreateWorkspaceRequest;
import com.orbit.workspace.dto.DeleteWorkspaceRequest;
import com.orbit.workspace.dto.TransferOwnershipRequest;
import com.orbit.workspace.dto.UpdateWorkspaceRequest;
import com.orbit.workspace.dto.WorkspaceDto;
import com.orbit.workspace.service.WorkspaceLifecycleService;
import com.orbit.workspace.service.WorkspaceService;
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
@RequestMapping("/api/v1/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaces;
    private final WorkspaceLifecycleService lifecycle;

    public WorkspaceController(WorkspaceService workspaces, WorkspaceLifecycleService lifecycle) {
        this.workspaces = workspaces;
        this.lifecycle = lifecycle;
    }

    @GetMapping
    public PageResponse<WorkspaceDto> list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(defaultValue = "false") boolean includeDeleted,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "" + PageParams.DEFAULT_SIZE) int size
    ) {
        return workspaces.list(principal.userId(), includeDeleted, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceDto create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody CreateWorkspaceRequest request
    ) {
        return workspaces.create(principal.userId(), request);
    }

    @GetMapping("/{workspaceId}")
    public WorkspaceDto get(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId
    ) {
        return workspaces.get(principal.userId(), workspaceId);
    }

    @PatchMapping("/{workspaceId}")
    public WorkspaceDto update(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @Valid @RequestBody UpdateWorkspaceRequest request
    ) {
        return workspaces.update(principal.userId(), workspaceId, request);
    }

    @DeleteMapping("/{workspaceId}")
    public WorkspaceDto delete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @Valid @RequestBody DeleteWorkspaceRequest request
    ) {
        return lifecycle.softDelete(principal.userId(), workspaceId, request);
    }

    @PostMapping("/{workspaceId}/restore")
    public WorkspaceDto restore(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId
    ) {
        return lifecycle.restore(principal.userId(), workspaceId);
    }

    @PostMapping("/{workspaceId}/transfer-ownership")
    public WorkspaceDto transferOwnership(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @Valid @RequestBody TransferOwnershipRequest request
    ) {
        return lifecycle.transferOwnership(principal.userId(), workspaceId, request);
    }
}
