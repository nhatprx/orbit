package com.orbit.whiteboard.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.PageResponse;
import com.orbit.whiteboard.dto.CreateWhiteboardRequest;
import com.orbit.whiteboard.dto.SaveWhiteboardSceneRequest;
import com.orbit.whiteboard.dto.UpdateWhiteboardRequest;
import com.orbit.whiteboard.dto.UpsertWhiteboardAssetRequest;
import com.orbit.whiteboard.dto.WhiteboardAssetResponse;
import com.orbit.whiteboard.dto.WhiteboardDetailResponse;
import com.orbit.whiteboard.dto.WhiteboardSceneSaveResponse;
import com.orbit.whiteboard.dto.WhiteboardSummaryResponse;
import com.orbit.whiteboard.service.WhiteboardAccessGuard;
import com.orbit.workspace.permission.Permissions;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Project-scoped Whiteboard REST API endpoints. */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/whiteboards")
public class ProjectWhiteboardController {

    private final WhiteboardAccessGuard guard;
    private final WhiteboardControllerSupport support;

    public ProjectWhiteboardController(WhiteboardAccessGuard guard, WhiteboardControllerSupport support) {
        this.guard = guard;
        this.support = support;
    }

    @GetMapping
    public PageResponse<WhiteboardSummaryResponse> list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "24") int size
    ) {
        return support.list(
            guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PWHITEBOARD_READ), q, page, size
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WhiteboardDetailResponse create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @RequestBody CreateWhiteboardRequest req
    ) {
        return support.create(
            guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PWHITEBOARD_WRITE), p.userId(), req
        );
    }

    @GetMapping("/{boardId}")
    public WhiteboardDetailResponse getDetail(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID boardId
    ) {
        return support.getDetail(
            guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PWHITEBOARD_READ), boardId
        );
    }

    @PatchMapping("/{boardId}")
    public WhiteboardSummaryResponse updateMetadata(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID boardId,
        @RequestBody UpdateWhiteboardRequest req
    ) {
        return support.updateMetadata(
            guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PWHITEBOARD_WRITE),
            boardId, p.userId(), req
        );
    }

    @PutMapping("/{boardId}/scene")
    public WhiteboardSceneSaveResponse saveScene(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID boardId,
        @RequestBody SaveWhiteboardSceneRequest req
    ) {
        return support.saveScene(
            guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PWHITEBOARD_WRITE),
            boardId, p.userId(), req
        );
    }

    @DeleteMapping("/{boardId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID boardId
    ) {
        support.delete(
            guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PWHITEBOARD_DELETE), boardId
        );
    }

    @GetMapping("/{boardId}/assets")
    public List<WhiteboardAssetResponse> listAssets(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID boardId
    ) {
        return support.listAssets(
            guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PWHITEBOARD_READ), boardId
        );
    }

    @PutMapping("/{boardId}/assets/{fileId}")
    public WhiteboardAssetResponse upsertAsset(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID boardId,
        @PathVariable String fileId,
        @RequestBody UpsertWhiteboardAssetRequest req
    ) {
        return support.upsertAsset(
            guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PWHITEBOARD_WRITE),
            boardId, p.userId(), fileId, req
        );
    }

    @DeleteMapping("/{boardId}/assets/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAsset(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID boardId,
        @PathVariable String fileId
    ) {
        support.deleteAsset(
            guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PWHITEBOARD_WRITE),
            boardId, fileId
        );
    }
}
