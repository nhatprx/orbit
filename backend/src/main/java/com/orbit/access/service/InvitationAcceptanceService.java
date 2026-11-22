package com.orbit.access.service;

import com.orbit.access.dto.AcceptInvitationResponse;
import com.orbit.access.dto.InvitationPreviewDto;
import com.orbit.access.entity.InvitationEntity;
import com.orbit.access.entity.InvitationStatus;
import com.orbit.access.entity.InvitationType;
import com.orbit.access.repository.InvitationRepository;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import com.orbit.common.Timestamps;
import com.orbit.common.PageParams;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.project.entity.ProjectMemberEntity;
import com.orbit.project.entity.ProjectMemberId;
import com.orbit.project.repository.ProjectMemberRepository;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.entity.WorkspaceEntity;
import com.orbit.workspace.entity.WorkspaceMemberEntity;
import com.orbit.workspace.entity.WorkspaceMemberId;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import com.orbit.workspace.repository.WorkspaceRepository;
import java.util.UUID;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Preview, accept and decline of invitations (BR-10, pending-invite token flow O-09). */
@Service
public class InvitationAcceptanceService {

    private final InvitationRepository invitations;
    private final WorkspaceRepository workspaces;
    private final ProjectRepository projects;
    private final WorkspaceMemberRepository workspaceMembers;
    private final ProjectMemberRepository projectMembers;
    private final InvitationRoleResolver roles;
    private final UserRepository users;
    private final InvitationMapper mapper;
    private final InvitationInboxMapper inboxMapper;

    InvitationAcceptanceService(
        InvitationRepository invitations,
        WorkspaceRepository workspaces,
        ProjectRepository projects,
        WorkspaceMemberRepository workspaceMembers,
        ProjectMemberRepository projectMembers,
        InvitationRoleResolver roles,
        UserRepository users,
        InvitationMapper mapper,
        InvitationInboxMapper inboxMapper
    ) {
        this.invitations = invitations;
        this.workspaces = workspaces;
        this.projects = projects;
        this.workspaceMembers = workspaceMembers;
        this.projectMembers = projectMembers;
        this.roles = roles;
        this.users = users;
        this.mapper = mapper;
        this.inboxMapper = inboxMapper;
    }

    @Transactional(readOnly = true)
    public com.orbit.common.PageResponse<com.orbit.access.dto.InvitationInboxDto> listInbox(UUID userId, int page, int size) {
        UserEntity user = users.findById(userId)
            .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));
        Page<InvitationEntity> result = invitations.findPendingInbox(
            user.getEmail().toLowerCase(Locale.ROOT), InvitationType.EMAIL,
            InvitationStatus.PENDING, Timestamps.now(),
            PageParams.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return inboxMapper.toResponse(result);
    }

    @Transactional(readOnly = true)
    public InvitationPreviewDto preview(String token) {
        InvitationEntity invitation = invitations.findByToken(token).orElseThrow(InvitationAcceptanceService::notFound);
        WorkspaceEntity workspace = activeWorkspace(invitation);
        String projectName = invitation.getProjectId() == null ? null : activeProject(invitation).getName();
        return new InvitationPreviewDto(
            invitation.getToken(),
            workspace.getId(),
            workspace.getName(),
            invitation.getProjectId(),
            projectName,
            mapper.roleName(invitation),
            invitation.getType().name(),
            invitation.getEmail(),
            invitation.effectiveStatus(Timestamps.now()).name(),
            invitation.getExpiresAt()
        );
    }

    @Transactional
    public AcceptInvitationResponse accept(UUID userId, String token) {
        InvitationEntity invitation = invitations.findByTokenForUpdate(token)
            .orElseThrow(InvitationAcceptanceService::notFound);
        assertUsable(invitation);
        activeWorkspace(invitation);
        UUID workspaceId = invitation.getWorkspaceId();
        requireMatchingEmail(invitation, userId);

        boolean alreadyMember = workspaceMembers.existsById(new WorkspaceMemberId(workspaceId, userId));
        if (!alreadyMember) {
            workspaceMembers.save(new WorkspaceMemberEntity(workspaceId, userId, roles.workspaceRoleToApply(invitation)));
        }
        if (invitation.getProjectId() != null) {
            ProjectEntity project = activeProject(invitation);
            if (!projectMembers.existsById(new ProjectMemberId(project.getId(), userId))) {
                projectMembers.save(new ProjectMemberEntity(project.getId(), userId, roles.projectRoleToApply(invitation)));
            }
        }
        if (invitation.getType() == InvitationType.EMAIL) {
            invitation.setStatus(InvitationStatus.ACCEPTED);
            invitations.save(invitation);
        }
        return new AcceptInvitationResponse(
            workspaceId, invitation.getProjectId(), mapper.roleName(invitation), alreadyMember
        );
    }

    @Transactional
    public void decline(UUID userId, String token) {
        InvitationEntity invitation = invitations.findByTokenForUpdate(token)
            .orElseThrow(InvitationAcceptanceService::notFound);
        if (invitation.getType() != InvitationType.EMAIL) {
            throw ApiException.badRequest("INVITATION_NOT_DECLINABLE", "Invite links cannot be declined.");
        }
        assertUsable(invitation);
        requireMatchingEmail(invitation, userId);
        invitation.setStatus(InvitationStatus.DECLINED);
        invitations.save(invitation);
    }

    private void assertUsable(InvitationEntity invitation) {
        switch (invitation.effectiveStatus(Timestamps.now())) {
            case REVOKED -> throw ApiException.gone("INVITATION_REVOKED", "This invitation was revoked.");
            case EXPIRED -> throw ApiException.gone("INVITATION_EXPIRED", "This invitation has expired.");
            case ACCEPTED, DECLINED ->
                throw ApiException.conflict("INVITATION_ALREADY_USED", "This invitation was already used.");
            default -> { }
        }
    }

    private void requireMatchingEmail(InvitationEntity invitation, UUID userId) {
        if (invitation.getType() != InvitationType.EMAIL) return;
        UserEntity user = users.findById(userId)
            .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));
        if (!user.getEmail().equalsIgnoreCase(invitation.getEmail())) {
            throw ApiException.forbidden(
                "INVITATION_EMAIL_MISMATCH", "This invitation was sent to a different email address."
            );
        }
    }

    private WorkspaceEntity activeWorkspace(InvitationEntity invitation) {
        return workspaces.findByIdAndDeletedAtIsNull(invitation.getWorkspaceId())
            .orElseThrow(InvitationAcceptanceService::notFound);
    }

    private ProjectEntity activeProject(InvitationEntity invitation) {
        return projects.findByIdAndWorkspaceIdAndDeletedAtIsNull(invitation.getProjectId(), invitation.getWorkspaceId())
            .orElseThrow(InvitationAcceptanceService::notFound);
    }

    private static ApiException notFound() {
        return ApiException.notFound("NOT_FOUND", "Invitation not found.");
    }
}
