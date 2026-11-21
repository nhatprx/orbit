package com.orbit.cloud.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.CreateDocumentRequest;
import com.orbit.cloud.dto.OfficeDocumentResponse;
import com.orbit.cloud.dto.SaveOfficeDocumentRequest;
import com.orbit.cloud.dto.SaveTextContentRequest;
import com.orbit.cloud.dto.TextContentResponse;
import com.orbit.cloud.service.CloudAccessGuard;
import com.orbit.cloud.service.CloudDocumentService;
import com.orbit.cloud.service.CloudOfficeService;
import com.orbit.cloud.service.CloudScope;
import com.orbit.workspace.permission.Permissions;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Document creation, in-place text editing, and Orbit Native Office endpoints across all 3 Cloud Files scopes. */
@RestController
public class CloudDocumentController {

    private final CloudAccessGuard guard;
    private final CloudDocumentService documentService;
    private final CloudOfficeService officeService;

    public CloudDocumentController(
        CloudAccessGuard guard,
        CloudDocumentService documentService,
        CloudOfficeService officeService
    ) {
        this.guard = guard;
        this.documentService = documentService;
        this.officeService = officeService;
    }

    @PostMapping("/api/v1/cloud/me/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public CloudNodeResponse createUserDocument(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @Valid @RequestBody CreateDocumentRequest req
    ) {
        return documentService.createDocument(guard.requireUserScope(p.userId()), p.userId(), req);
    }

    @GetMapping("/api/v1/cloud/me/nodes/{nodeId}/content")
    public TextContentResponse getUserContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID nodeId
    ) {
        return documentService.getTextContent(guard.requireUserScope(p.userId()), nodeId);
    }

    @PutMapping("/api/v1/cloud/me/nodes/{nodeId}/content")
    public CloudNodeResponse saveUserContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID nodeId,
        @Valid @RequestBody SaveTextContentRequest req
    ) {
        return documentService.saveTextContent(guard.requireUserScope(p.userId()), p.userId(), nodeId, req);
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

    @PostMapping("/api/v1/workspaces/{workspaceId}/cloud/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public CloudNodeResponse createWorkspaceDocument(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @Valid @RequestBody CreateDocumentRequest req
    ) {
        CloudScope scope = guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_WRITE);
        return documentService.createDocument(scope, p.userId(), req);
    }

    @GetMapping("/api/v1/workspaces/{workspaceId}/cloud/nodes/{nodeId}/content")
    public TextContentResponse getWorkspaceContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID nodeId
    ) {
        CloudScope scope = guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_READ);
        return documentService.getTextContent(scope, nodeId);
    }

    @PutMapping("/api/v1/workspaces/{workspaceId}/cloud/nodes/{nodeId}/content")
    public CloudNodeResponse saveWorkspaceContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID nodeId,
        @Valid @RequestBody SaveTextContentRequest req
    ) {
        CloudScope scope = guard.requireWorkspaceScope(p.userId(), workspaceId, Permissions.FILES_WRITE);
        return documentService.saveTextContent(scope, p.userId(), nodeId, req);
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

    @PostMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/cloud/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public CloudNodeResponse createProjectDocument(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @Valid @RequestBody CreateDocumentRequest req
    ) {
        CloudScope scope = guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_WRITE);
        return documentService.createDocument(scope, p.userId(), req);
    }

    @GetMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/cloud/nodes/{nodeId}/content")
    public TextContentResponse getProjectContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID nodeId
    ) {
        CloudScope scope = guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_READ);
        return documentService.getTextContent(scope, nodeId);
    }

    @PutMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/cloud/nodes/{nodeId}/content")
    public CloudNodeResponse saveProjectContent(
        @AuthenticationPrincipal AuthenticatedUserPrincipal p,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID nodeId,
        @Valid @RequestBody SaveTextContentRequest req
    ) {
        CloudScope scope = guard.requireProjectScope(p.userId(), workspaceId, projectId, Permissions.PFILES_WRITE);
        return documentService.saveTextContent(scope, p.userId(), nodeId, req);
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
