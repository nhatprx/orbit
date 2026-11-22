package com.orbit.cloud.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/cloud")
public class ProjectCloudController {

    private final CloudAccessGuard guard;
    private final CloudControllerSupport support;

    public ProjectCloudController(CloudAccessGuard guard, CloudControllerSupport support) {
        this.guard = guard;
        this.support = support;
    }

    @GetMapping("/nodes")
    public CursorPageResponse<CloudNodeResponse> listNodes(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId,
        @RequestParam(required = false) UUID parentId, @RequestParam(defaultValue = "ALL") String view,
        @RequestParam(required = false) String q, @RequestParam(required = false) String sortBy,
        @RequestParam(required = false) String sortDir, @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "" + PageParams.DEFAULT_SIZE) int limit
    ) {
        var scope = guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_READ);
        return support.listNodes(scope, parentId, view, q, sortBy, sortDir, cursor, limit);
    }

    @GetMapping("/nodes/{nodeId}/breadcrumbs")
    public CloudBreadcrumbsResponse breadcrumbs(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable UUID nodeId
    ) {
        return support.breadcrumbs(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_READ), nodeId);
    }

    @GetMapping("/quota")
    public CloudQuotaResponse quota(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId
    ) {
        return support.quota(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_READ));
    }

    @PostMapping("/folders")
    @ResponseStatus(HttpStatus.CREATED)
    public CloudNodeResponse createFolder(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId, @Valid @RequestBody CreateFolderRequest req
    ) {
        return support.createFolder(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_WRITE), p.userId(), req);
    }

    @PatchMapping("/nodes/{nodeId}")
    public CloudNodeResponse updateNode(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId,
        @PathVariable UUID nodeId, @Valid @RequestBody UpdateCloudNodeRequest req
    ) {
        return support.updateNode(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_WRITE), p.userId(), nodeId, req);
    }

    @DeleteMapping("/nodes/{nodeId}")
    public CloudNodeResponse softDelete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable UUID nodeId
    ) {
        return support.softDelete(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_DELETE), p.userId(), nodeId);
    }

    @PostMapping("/nodes/{nodeId}/restore")
    public CloudNodeResponse restore(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable UUID nodeId
    ) {
        return support.restore(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_WRITE), p.userId(), nodeId);
    }

    @DeleteMapping("/nodes/{nodeId}/permanent")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void permanentDelete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable UUID nodeId
    ) {
        support.permanentDelete(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_MANAGE), nodeId);
    }

    @DeleteMapping("/trash")
    public EmptyTrashResponse emptyTrash(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId
    ) {
        return support.emptyTrash(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_MANAGE));
    }

    @PostMapping("/uploads/init")
    @ResponseStatus(HttpStatus.CREATED)
    public InitUploadResponse initUpload(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId, @Valid @RequestBody InitUploadRequest req
    ) {
        return support.initUpload(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_WRITE), p.userId(), req);
    }

    @PostMapping("/uploads/{sessionId}/parts/sign")
    public SignPartsResponse signParts(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId,
        @PathVariable UUID sessionId, @Valid @RequestBody SignPartsRequest req
    ) {
        return support.signParts(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_WRITE), p.userId(), sessionId, req);
    }

    @PostMapping("/uploads/{sessionId}/complete")
    public CloudNodeResponse completeUpload(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId,
        @PathVariable UUID sessionId, @Valid @RequestBody(required = false) CompleteUploadRequest req
    ) {
        return support.completeUpload(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_WRITE), p.userId(), sessionId, req);
    }

    @PostMapping("/uploads/{sessionId}/abort")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void abortUpload(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable UUID sessionId
    ) {
        support.abortUpload(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_WRITE), sessionId);
    }

    @GetMapping("/nodes/{nodeId}/download")
    public CloudDownloadResponse download(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable UUID nodeId
    ) {
        return support.download(guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_READ), p.userId(), nodeId);
    }
}
