package com.orbit.access.service;

import com.orbit.access.dto.CreateEmailInvitationRequest;
import com.orbit.access.dto.CreateLinkInvitationRequest;
import com.orbit.access.dto.InvitationDto;
import com.orbit.access.entity.InvitationEntity;
import com.orbit.access.entity.InvitationStatus;
import com.orbit.access.entity.InvitationType;
import com.orbit.access.repository.InvitationRepository;
import com.orbit.access.repository.ProjectMemberQueries;
import com.orbit.access.repository.WorkspaceMemberQueries;
import com.orbit.common.ApiException;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import com.orbit.common.Timestamps;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Collection;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creates, lists and revokes email invitations and reusable invite links (BR-10). */
@Service
public class InvitationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final InvitationRepository invitations;
    private final InvitationRoleResolver roles;
    private final WorkspaceMemberQueries workspaceMemberQueries;
    private final ProjectMemberQueries projectMemberQueries;
    private final InvitationMapper mapper;
    private final InvitationNotifier notifier;
    private final WorkspacePermissionEvaluator evaluator;
    private final Duration expiry;

    InvitationService(
        InvitationRepository invitations,
        InvitationRoleResolver roles,
        WorkspaceMemberQueries workspaceMemberQueries,
        ProjectMemberQueries projectMemberQueries,
        InvitationMapper mapper,
        InvitationNotifier notifier,
        WorkspacePermissionEvaluator evaluator,
        @Value("${orbit.invitation.expiry-days:7}") long expiryDays
    ) {
        this.invitations = invitations;
        this.roles = roles;
        this.workspaceMemberQueries = workspaceMemberQueries;
        this.projectMemberQueries = projectMemberQueries;
        this.mapper = mapper;
        this.notifier = notifier;
        this.evaluator = evaluator;
        this.expiry = Duration.ofDays(expiryDays);
    }

    @Transactional(readOnly = true)
    public PageResponse<InvitationDto> list(UUID userId, UUID workspaceId, int page, int size) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.MEMBER_INVITE);
        Pageable pageable = PageParams.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        var result = invitations.findByWorkspaceId(workspaceId, pageable);
        return PageResponse.from(result, mapper.toDtos(result.getContent()));
    }

    @Transactional
    public InvitationDto createEmail(UUID userId, UUID workspaceId, CreateEmailInvitationRequest request) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.MEMBER_INVITE);
        UUID roleId = roles.resolveForCreate(userId, workspaceId, request.projectId(), request.roleId());
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        assertInvitable(workspaceId, request.projectId(), email);
        InvitationEntity saved = persist(workspaceId, request.projectId(), InvitationType.EMAIL, email, roleId, userId);
        notifier.invitationCreated(saved.getId(), workspaceId, email);
        return mapper.toDto(saved);
    }

    @Transactional
    public InvitationDto createLink(UUID userId, UUID workspaceId, CreateLinkInvitationRequest request) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.MEMBER_INVITE);
        UUID roleId = roles.resolveForCreate(userId, workspaceId, request.projectId(), request.roleId());
        return mapper.toDto(persist(workspaceId, request.projectId(), InvitationType.LINK, null, roleId, userId));
    }

    @Transactional
    public void revoke(UUID userId, UUID workspaceId, UUID invitationId) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.MEMBER_INVITE);
        InvitationEntity invitation = invitations.findByIdAndWorkspaceId(invitationId, workspaceId)
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Invitation not found."));
        if (invitation.getStatus() == InvitationStatus.PENDING) {
            invitation.setStatus(InvitationStatus.REVOKED);
            invitations.save(invitation);
        }
    }

    /** Invitations submitted with the creation wizard; the creator is the Owner so no checks apply. */
    @Transactional
    public void createInitial(UUID workspaceId, UUID inviterId, Collection<String> emails) {
        if (emails.isEmpty()) return;
        UUID memberRoleId = roles.defaultWorkspaceRoleId(workspaceId);
        for (String email : emails) {
            InvitationEntity saved = persist(workspaceId, null, InvitationType.EMAIL, email, memberRoleId, inviterId);
            notifier.invitationCreated(saved.getId(), workspaceId, email);
        }
    }

    private void assertInvitable(UUID workspaceId, UUID projectId, String email) {
        boolean member = projectId == null
            ? workspaceMemberQueries.existsByEmail(workspaceId, email)
            : projectMemberQueries.existsByEmail(projectId, email);
        if (member) {
            throw ApiException.conflict("ALREADY_MEMBER", "This person is already a member.");
        }
        boolean pending = projectId == null
            ? invitations.existsPendingWorkspaceEmail(workspaceId, email, Timestamps.now())
            : invitations.existsPendingProjectEmail(workspaceId, projectId, email, Timestamps.now());
        if (pending) {
            throw ApiException.conflict("INVITATION_ALREADY_PENDING", "An invitation for this email is already pending.");
        }
    }

    private InvitationEntity persist(
        UUID workspaceId, UUID projectId, InvitationType type, String email, UUID roleId, UUID inviterId
    ) {
        InvitationEntity invitation = new InvitationEntity();
        invitation.setWorkspaceId(workspaceId);
        invitation.setProjectId(projectId);
        invitation.setType(type);
        invitation.setEmail(email);
        invitation.setToken(newToken());
        invitation.setRoleId(roleId);
        invitation.setInvitedBy(inviterId);
        invitation.setExpiresAt(Timestamps.now().plus(expiry));
        return invitations.save(invitation);
    }

    static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
