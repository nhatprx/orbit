package com.orbit.cloud.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.collab.dto.LockResourceRequest;
import com.orbit.cloud.entity.CloudScopeType;
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
@RequestMapping("/api/v1/cloud/me")
public class UserCloudController {

    private final CloudAccessGuard guard;
    private final CloudControllerSupport support;

    public UserCloudController(CloudAccessGuard guard, CloudControllerSupport support) {
        this.guard = guard;
        this.support = support;
    }

    @PutMapping("/nodes/{nodeId}/lock")
    public CloudNodeResponse setLocked(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID nodeId, @Valid @RequestBody LockResourceRequest request
    ) {
        return support.setLocked(
            guard.requireOwnerScope(principal.userId(), CloudScopeType.USER, null, null),
            principal.userId(), nodeId, request.locked()
        );
    }

    @GetMapping("/nodes")
    public CursorPageResponse<CloudNodeResponse> listNodes(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) UUID parentId,
        @RequestParam(defaultValue = "ALL") String view,
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String sortBy,
        @RequestParam(required = false) String sortDir,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "" + PageParams.DEFAULT_SIZE) int limit
    ) {
        return support.listNodes(guard.requireUserScope(principal.userId()), parentId, view, q, sortBy, sortDir, cursor, limit);
    }

    @GetMapping("/nodes/{nodeId}/breadcrumbs")
    public CloudBreadcrumbsResponse breadcrumbs(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @PathVariable UUID nodeId
    ) {
        return support.breadcrumbs(guard.requireUserScope(principal.userId()), nodeId);
    }

    @GetMapping("/quota")
    public CloudQuotaResponse quota(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return support.quota(guard.requireUserScope(principal.userId()));
    }

    @PostMapping("/folders")
    @ResponseStatus(HttpStatus.CREATED)
    public CloudNodeResponse createFolder(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @Valid @RequestBody CreateFolderRequest req
    ) {
        return support.createFolder(guard.requireUserScope(principal.userId()), principal.userId(), req);
    }

    @PatchMapping("/nodes/{nodeId}")
    public CloudNodeResponse updateNode(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID nodeId,
        @Valid @RequestBody UpdateCloudNodeRequest req
    ) {
        return support.updateNode(guard.requireUserScope(principal.userId()), principal.userId(), nodeId, req);
    }

    @DeleteMapping("/nodes/{nodeId}")
    public CloudNodeResponse softDelete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @PathVariable UUID nodeId
    ) {
        return support.softDelete(guard.requireUserScope(principal.userId()), principal.userId(), nodeId);
    }

    @PostMapping("/nodes/{nodeId}/restore")
    public CloudNodeResponse restore(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @PathVariable UUID nodeId
    ) {
        return support.restore(guard.requireUserScope(principal.userId()), principal.userId(), nodeId);
    }

    @DeleteMapping("/nodes/{nodeId}/permanent")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void permanentDelete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @PathVariable UUID nodeId
    ) {
        support.permanentDelete(guard.requireUserScope(principal.userId()), nodeId);
    }

    @DeleteMapping("/trash")
    public EmptyTrashResponse emptyTrash(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return support.emptyTrash(guard.requireUserScope(principal.userId()));
    }

    @PostMapping("/uploads/init")
    @ResponseStatus(HttpStatus.CREATED)
    public InitUploadResponse initUpload(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @Valid @RequestBody InitUploadRequest req
    ) {
        return support.initUpload(guard.requireUserScope(principal.userId()), principal.userId(), req);
    }

    @PostMapping("/uploads/{sessionId}/parts/sign")
    public SignPartsResponse signParts(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID sessionId,
        @Valid @RequestBody SignPartsRequest req
    ) {
        return support.signParts(guard.requireUserScope(principal.userId()), principal.userId(), sessionId, req);
    }

    @PostMapping("/uploads/{sessionId}/complete")
    public CloudNodeResponse completeUpload(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID sessionId,
        @Valid @RequestBody(required = false) CompleteUploadRequest req
    ) {
        return support.completeUpload(guard.requireUserScope(principal.userId()), principal.userId(), sessionId, req);
    }

    @PostMapping("/uploads/{sessionId}/abort")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void abortUpload(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @PathVariable UUID sessionId
    ) {
        support.abortUpload(guard.requireUserScope(principal.userId()), sessionId);
    }

    @GetMapping("/nodes/{nodeId}/download")
    public CloudDownloadResponse download(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @PathVariable UUID nodeId
    ) {
        return support.download(guard.requireUserScope(principal.userId()), principal.userId(), nodeId);
    }
}
