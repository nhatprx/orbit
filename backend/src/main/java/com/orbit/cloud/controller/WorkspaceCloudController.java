package com.orbit.cloud.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.collab.dto.LockResourceRequest;
import com.orbit.cloud.dto.CloudBreadcrumbsResponse;
import com.orbit.cloud.dto.CloudDownloadResponse;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.CloudQuotaResponse;
import com.orbit.cloud.dto.CompleteUploadRequest;
import com.orbit.cloud.dto.CreateFolderRequest;
import com.orbit.cloud.dto.EmptyTrashResponse;
import com.orbit.cloud.dto.InitUploadRequest;
import com.orbit.cloud.dto.InitUploadResponse;
import com.orbit.cloud.dto.SignPartsRequest;
import com.orbit.cloud.dto.SignPartsResponse;
import com.orbit.cloud.dto.UpdateCloudNodeRequest;
import com.orbit.cloud.service.CloudAccessGuard;
import com.orbit.common.CursorPageResponse;
import com.orbit.common.PageParams;
import com.orbit.workspace.permission.Permissions;
import jakarta.validation.Valid;
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

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/cloud")
public class WorkspaceCloudController {

    private final CloudAccessGuard guard;
    private final CloudControllerSupport support;

    public WorkspaceCloudController(CloudAccessGuard guard, CloudControllerSupport support) {
        this.guard = guard;
        this.support = support;
    }

    @PutMapping("/nodes/{nodeId}/lock")
    public CloudNodeResponse setLocked(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID nodeId, @Valid @RequestBody LockResourceRequest request
    ) {
        return support.setLocked(
            guard.requireOwnerScope(p.userId(), com.orbit.cloud.entity.CloudScopeType.WORKSPACE, workspaceId, null),
            p.userId(), nodeId, request.locked()
        );
    }

    @GetMapping("/nodes")
    public CursorPageResponse<CloudNodeResponse> listNodes(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @RequestParam(required = false) UUID parentId, @RequestParam(defaultValue = "ALL") String view,
        @RequestParam(required = false) String q, @RequestParam(required = false) String sortBy,
        @RequestParam(required = false) String sortDir, @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "" + PageParams.DEFAULT_SIZE) int limit
    ) {
        var scope = guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_READ);
        return support.listNodes(scope, parentId, view, q, sortBy, sortDir, cursor, limit);
    }

    @GetMapping("/nodes/{nodeId}/breadcrumbs")
    public CloudBreadcrumbsResponse breadcrumbs(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID nodeId
    ) {
        return support.breadcrumbs(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_READ), nodeId);
    }

    @GetMapping("/quota")
    public CloudQuotaResponse quota(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId) {
        return support.quota(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_READ));
    }

    @PostMapping("/folders")
    @ResponseStatus(HttpStatus.CREATED)
    public CloudNodeResponse createFolder(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @Valid @RequestBody CreateFolderRequest req
    ) {
        return support.createFolder(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_WRITE), p.userId(), req);
    }

    @PatchMapping("/nodes/{nodeId}")
    public CloudNodeResponse updateNode(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID nodeId, @Valid @RequestBody UpdateCloudNodeRequest req
    ) {
        return support.updateNode(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_WRITE), p.userId(), nodeId, req);
    }

    @DeleteMapping("/nodes/{nodeId}")
    public CloudNodeResponse softDelete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID nodeId
    ) {
        return support.softDelete(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_DELETE), p.userId(), nodeId);
    }

    @PostMapping("/nodes/{nodeId}/restore")
    public CloudNodeResponse restore(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID nodeId
    ) {
        return support.restore(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_WRITE), p.userId(), nodeId);
    }

    @DeleteMapping("/nodes/{nodeId}/permanent")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void permanentDelete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID nodeId
    ) {
        support.permanentDelete(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_MANAGE), nodeId);
    }

    @DeleteMapping("/trash")
    public EmptyTrashResponse emptyTrash(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId) {
        return support.emptyTrash(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_MANAGE));
    }

    @PostMapping("/uploads/init")
    @ResponseStatus(HttpStatus.CREATED)
    public InitUploadResponse initUpload(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @Valid @RequestBody InitUploadRequest req
    ) {
        return support.initUpload(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_WRITE), p.userId(), req);
    }

    @PostMapping("/uploads/{sessionId}/parts/sign")
    public SignPartsResponse signParts(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID sessionId, @Valid @RequestBody SignPartsRequest req
    ) {
        return support.signParts(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_WRITE), p.userId(), sessionId, req);
    }

    @PostMapping("/uploads/{sessionId}/complete")
    public CloudNodeResponse completeUpload(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId,
        @PathVariable UUID sessionId, @Valid @RequestBody(required = false) CompleteUploadRequest req
    ) {
        return support.completeUpload(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_WRITE), p.userId(), sessionId, req);
    }

    @PostMapping("/uploads/{sessionId}/abort")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void abortUpload(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID sessionId
    ) {
        support.abortUpload(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_WRITE), sessionId);
    }

    @GetMapping("/nodes/{nodeId}/download")
    public CloudDownloadResponse download(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID nodeId
    ) {
        return support.download(guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_READ), p.userId(), nodeId);
    }
}
