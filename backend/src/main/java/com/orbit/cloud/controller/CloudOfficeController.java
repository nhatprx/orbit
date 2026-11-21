package com.orbit.cloud.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.OfficeDocumentResponse;
import com.orbit.cloud.dto.SaveOfficeDocumentRequest;
import com.orbit.cloud.service.CloudAccessGuard;
import com.orbit.cloud.service.CloudOfficeService;
import com.orbit.cloud.service.CloudScope;
import com.orbit.workspace.permission.Permissions;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Orbit Native Office read/save endpoints across User, Workspace, and Project Cloud Files scopes. */
@RestController
public class CloudOfficeController {

    private final CloudAccessGuard guard;
    private final CloudOfficeService officeService;

    public CloudOfficeController(CloudAccessGuard guard, CloudOfficeService officeService) {
        this.guard = guard;
        this.officeService = officeService;
    }

    @GetMapping("/api/v1/cloud/me/nodes/{nodeId}/office-content")
    public OfficeDocumentResponse getUserOfficeContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID nodeId
    ) {
        return officeService.getOfficeContent(guard.requireUserScope(p.userId()), nodeId);
    }

    @PutMapping("/api/v1/cloud/me/nodes/{nodeId}/office-content")
    public CloudNodeResponse saveUserOfficeContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID nodeId,
        @Valid @RequestBody SaveOfficeDocumentRequest req
    ) {
        return officeService.saveOfficeContent(guard.requireUserScope(p.userId()), p.userId(), nodeId, req);
    }

    @GetMapping("/api/v1/workspaces/{workspaceId}/cloud/nodes/{nodeId}/office-content")
    public OfficeDocumentResponse getWorkspaceOfficeContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID nodeId
    ) {
        CloudScope scope = guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_READ);
        return officeService.getOfficeContent(scope, nodeId);
    }

    @PutMapping("/api/v1/workspaces/{workspaceId}/cloud/nodes/{nodeId}/office-content")
    public CloudNodeResponse saveWorkspaceOfficeContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID nodeId,
        @Valid @RequestBody SaveOfficeDocumentRequest req
    ) {
        CloudScope scope = guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_WRITE);
        return officeService.saveOfficeContent(scope, p.userId(), nodeId, req);
    }

    @GetMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/cloud/nodes/{nodeId}/office-content")
    public OfficeDocumentResponse getProjectOfficeContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID nodeId
    ) {
        CloudScope scope = guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_READ);
        return officeService.getOfficeContent(scope, nodeId);
    }

    @PutMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/cloud/nodes/{nodeId}/office-content")
    public CloudNodeResponse saveProjectOfficeContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID nodeId,
        @Valid @RequestBody SaveOfficeDocumentRequest req
    ) {
        CloudScope scope = guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_WRITE);
        return officeService.saveOfficeContent(scope, p.userId(), nodeId, req);
    }
}
