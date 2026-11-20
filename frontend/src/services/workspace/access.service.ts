import type {
  AcceptInvitationResponse,
  AddProjectMemberRequest,
  AssignMemberRoleRequest,
  CreateEmailInvitationRequest,
  CreateLinkInvitationRequest,
  CreateRoleRequest,
  InvitationDto,
  InvitationPreviewDto,
  MemberDto,
  PageResponse,
  RoleDto,
  UpdateRoleRequest,
} from '../../types/workspace.types';

export interface RoleService {
  listWorkspaceRoles(workspaceId: string): Promise<RoleDto[]>;
  createWorkspaceRole(workspaceId: string, request: CreateRoleRequest): Promise<RoleDto>;
  updateWorkspaceRole(
    workspaceId: string,
    roleId: string,
    request: UpdateRoleRequest
  ): Promise<RoleDto>;
  deleteWorkspaceRole(workspaceId: string, roleId: string): Promise<void>;
  listProjectRoles(workspaceId: string, projectId: string): Promise<RoleDto[]>;
  createProjectRole(
    workspaceId: string,
    projectId: string,
    request: CreateRoleRequest
  ): Promise<RoleDto>;
  updateProjectRole(
    workspaceId: string,
    projectId: string,
    roleId: string,
    request: UpdateRoleRequest
  ): Promise<RoleDto>;
  deleteProjectRole(workspaceId: string, projectId: string, roleId: string): Promise<void>;
}

export interface MemberService {
  listWorkspaceMembers(
    workspaceId: string,
    page?: number,
    size?: number
  ): Promise<PageResponse<MemberDto>>;
  assignWorkspaceMemberRole(
    workspaceId: string,
    userId: string,
    request: AssignMemberRoleRequest
  ): Promise<MemberDto>;
  removeWorkspaceMember(workspaceId: string, userId: string): Promise<void>;
  listProjectMembers(
    workspaceId: string,
    projectId: string,
    page?: number,
    size?: number
  ): Promise<PageResponse<MemberDto>>;
  addProjectMember(
    workspaceId: string,
    projectId: string,
    request: AddProjectMemberRequest
  ): Promise<MemberDto>;
  assignProjectMemberRole(
    workspaceId: string,
    projectId: string,
    userId: string,
    request: AssignMemberRoleRequest
  ): Promise<MemberDto>;
  removeProjectMember(workspaceId: string, projectId: string, userId: string): Promise<void>;
}

export interface InvitationService {
  listInvitations(
    workspaceId: string,
    page?: number,
    size?: number
  ): Promise<PageResponse<InvitationDto>>;
  createEmailInvitation(
    workspaceId: string,
    request: CreateEmailInvitationRequest
  ): Promise<InvitationDto>;
  createLinkInvitation(
    workspaceId: string,
    request: CreateLinkInvitationRequest
  ): Promise<InvitationDto>;
  revokeInvitation(workspaceId: string, invitationId: string): Promise<void>;
  previewInvitation(token: string): Promise<InvitationPreviewDto>;
  acceptInvitation(token: string): Promise<AcceptInvitationResponse>;
  declineInvitation(token: string): Promise<void>;
}
