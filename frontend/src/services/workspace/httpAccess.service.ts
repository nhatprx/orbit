import type {
  AcceptInvitationResponse,
  AddProjectMemberRequest,
  AssignMemberRoleRequest,
  CreateEmailInvitationRequest,
  CreateLinkInvitationRequest,
  CreateRoleRequest,
  InvitationDto,
  InvitationInboxDto,
  InvitationPreviewDto,
  MemberDto,
  PageResponse,
  RoleDto,
  UpdateRoleRequest,
} from '../../types/workspace.types';
import type { InvitationService, MemberService, RoleService } from './access.service';
import { apiRequest, seg } from './httpClient';

const WS = '/api/v1/workspaces';
const project = (workspaceId: string, projectId: string) =>
  `${WS}/${seg(workspaceId)}/projects/${seg(projectId)}`;

class HttpRoleService implements RoleService {
  listWorkspaceRoles(workspaceId: string) {
    return apiRequest<RoleDto[]>('GET', `${WS}/${seg(workspaceId)}/roles`);
  }

  createWorkspaceRole(workspaceId: string, request: CreateRoleRequest) {
    return apiRequest<RoleDto>('POST', `${WS}/${seg(workspaceId)}/roles`, { body: request });
  }

  updateWorkspaceRole(workspaceId: string, roleId: string, request: UpdateRoleRequest) {
    return apiRequest<RoleDto>('PATCH', `${WS}/${seg(workspaceId)}/roles/${seg(roleId)}`, {
      body: request,
    });
  }

  deleteWorkspaceRole(workspaceId: string, roleId: string) {
    return apiRequest<void>('DELETE', `${WS}/${seg(workspaceId)}/roles/${seg(roleId)}`);
  }

  listProjectRoles(workspaceId: string, projectId: string) {
    return apiRequest<RoleDto[]>('GET', `${project(workspaceId, projectId)}/roles`);
  }

  createProjectRole(workspaceId: string, projectId: string, request: CreateRoleRequest) {
    return apiRequest<RoleDto>('POST', `${project(workspaceId, projectId)}/roles`, { body: request });
  }

  updateProjectRole(workspaceId: string, projectId: string, roleId: string, request: UpdateRoleRequest) {
    return apiRequest<RoleDto>('PATCH', `${project(workspaceId, projectId)}/roles/${seg(roleId)}`, {
      body: request,
    });
  }

  deleteProjectRole(workspaceId: string, projectId: string, roleId: string) {
    return apiRequest<void>('DELETE', `${project(workspaceId, projectId)}/roles/${seg(roleId)}`);
  }
}

class HttpMemberService implements MemberService {
  listWorkspaceMembers(workspaceId: string, page?: number, size?: number) {
    return apiRequest<PageResponse<MemberDto>>('GET', `${WS}/${seg(workspaceId)}/members`, {
      query: { page, size },
    });
  }

  assignWorkspaceMemberRole(workspaceId: string, userId: string, request: AssignMemberRoleRequest) {
    return apiRequest<MemberDto>('PATCH', `${WS}/${seg(workspaceId)}/members/${seg(userId)}/role`, {
      body: request,
    });
  }

  removeWorkspaceMember(workspaceId: string, userId: string) {
    return apiRequest<void>('DELETE', `${WS}/${seg(workspaceId)}/members/${seg(userId)}`);
  }

  listProjectMembers(workspaceId: string, projectId: string, page?: number, size?: number) {
    return apiRequest<PageResponse<MemberDto>>('GET', `${project(workspaceId, projectId)}/members`, {
      query: { page, size },
    });
  }

  addProjectMember(workspaceId: string, projectId: string, request: AddProjectMemberRequest) {
    return apiRequest<MemberDto>('POST', `${project(workspaceId, projectId)}/members`, {
      body: request,
    });
  }

  assignProjectMemberRole(
    workspaceId: string,
    projectId: string,
    userId: string,
    request: AssignMemberRoleRequest
  ) {
    return apiRequest<MemberDto>(
      'PATCH',
      `${project(workspaceId, projectId)}/members/${seg(userId)}/role`,
      { body: request }
    );
  }

  removeProjectMember(workspaceId: string, projectId: string, userId: string) {
    return apiRequest<void>('DELETE', `${project(workspaceId, projectId)}/members/${seg(userId)}`);
  }
}

class HttpInvitationService implements InvitationService {
  listInbox(page?: number, size?: number) {
    return apiRequest<PageResponse<InvitationInboxDto>>('GET', '/api/v1/invitations/inbox', { query: { page, size } });
  }

  listInvitations(workspaceId: string, page?: number, size?: number) {
    return apiRequest<PageResponse<InvitationDto>>('GET', `${WS}/${seg(workspaceId)}/invitations`, {
      query: { page, size },
    });
  }

  createEmailInvitation(workspaceId: string, request: CreateEmailInvitationRequest) {
    return apiRequest<InvitationDto>('POST', `${WS}/${seg(workspaceId)}/invitations/email`, {
      body: request,
    });
  }

  createLinkInvitation(workspaceId: string, request: CreateLinkInvitationRequest) {
    return apiRequest<InvitationDto>('POST', `${WS}/${seg(workspaceId)}/invitations/link`, {
      body: request,
    });
  }

  revokeInvitation(workspaceId: string, invitationId: string) {
    return apiRequest<void>('DELETE', `${WS}/${seg(workspaceId)}/invitations/${seg(invitationId)}`);
  }

  previewInvitation(token: string) {
    return apiRequest<InvitationPreviewDto>('GET', `/api/v1/invitations/${seg(token)}`, {
      auth: false,
    });
  }

  acceptInvitation(token: string) {
    return apiRequest<AcceptInvitationResponse>('POST', `/api/v1/invitations/${seg(token)}/accept`);
  }

  declineInvitation(token: string) {
    return apiRequest<void>('POST', `/api/v1/invitations/${seg(token)}/decline`);
  }
}

export const httpRoleService: RoleService = new HttpRoleService();
export const httpMemberService: MemberService = new HttpMemberService();
export const httpInvitationService: InvitationService = new HttpInvitationService();
