package com.orbit.access.controller;

import com.orbit.access.dto.AcceptInvitationResponse;
import com.orbit.access.dto.CreateEmailInvitationRequest;
import com.orbit.access.dto.CreateLinkInvitationRequest;
import com.orbit.access.dto.InvitationDto;
import com.orbit.access.dto.InvitationPreviewDto;
import com.orbit.access.service.InvitationAcceptanceService;
import com.orbit.access.service.InvitationService;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class InvitationController {

    private final InvitationService invitations;
    private final InvitationAcceptanceService acceptance;

    public InvitationController(InvitationService invitations, InvitationAcceptanceService acceptance) {
        this.invitations = invitations;
        this.acceptance = acceptance;
    }

    @GetMapping("/workspaces/{workspaceId}/invitations")
    public PageResponse<InvitationDto> list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "" + PageParams.DEFAULT_SIZE) int size
    ) {
        return invitations.list(principal.userId(), workspaceId, page, size);
    }

    @PostMapping("/workspaces/{workspaceId}/invitations/email")
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationDto createEmail(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @Valid @RequestBody CreateEmailInvitationRequest request
    ) {
        return invitations.createEmail(principal.userId(), workspaceId, request);
    }

    @PostMapping("/workspaces/{workspaceId}/invitations/link")
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationDto createLink(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @Valid @RequestBody(required = false) CreateLinkInvitationRequest request
    ) {
        CreateLinkInvitationRequest body = request == null ? new CreateLinkInvitationRequest(null, null) : request;
        return invitations.createLink(principal.userId(), workspaceId, body);
    }

    @DeleteMapping("/workspaces/{workspaceId}/invitations/{invitationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID invitationId
    ) {
        invitations.revoke(principal.userId(), workspaceId, invitationId);
    }

    /** Public: lets an invitee see what they were invited to before signing in. */
    @GetMapping("/invitations/{token}")
    public InvitationPreviewDto preview(@PathVariable String token) {
        return acceptance.preview(token);
    }

    @PostMapping("/invitations/{token}/accept")
    public AcceptInvitationResponse accept(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @PathVariable String token
    ) {
        return acceptance.accept(principal.userId(), token);
    }

    @PostMapping("/invitations/{token}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal, @PathVariable String token
    ) {
        acceptance.decline(principal.userId(), token);
    }
}
