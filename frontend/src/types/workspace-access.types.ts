export type RoleScope = 'WORKSPACE' | 'PROJECT';
export type InvitationType = 'EMAIL' | 'LINK';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED';

export type WorkspacePermissionKey =
  | 'workspace.view'
  | 'workspace.edit'
  | 'workspace.delete'
  | 'workspace.transfer_owner'
  | 'member.view'
  | 'member.invite'
  | 'member.remove'
  | 'member.assign_role'
  | 'role.view'
  | 'role.create'
  | 'role.edit'
  | 'role.delete'
  | 'module.enable'
  | 'module.disable'
  | 'integration.manage'
  | 'project.create'
  | 'project.view_all'
  | 'chat.read'
  | 'chat.write'
  | 'chat.manage'
  | 'issues.read'
  | 'issues.write'
  | 'issues.delete'
  | 'issues.manage';

export type ProjectPermissionKey =
  | 'project.view'
  | 'project.edit'
  | 'project.delete'
  | 'pmember.invite'
  | 'pmember.remove'
  | 'pmember.assign_role'
  | 'prole.create'
  | 'prole.edit'
  | 'prole.delete'
  | 'pmodule.select'
  | 'pchat.read'
  | 'pchat.write'
  | 'pchat.manage'
  | 'pissues.read'
  | 'pissues.write'
  | 'pissues.delete'
  | 'pissues.manage';

export interface RoleDto {
  id: string;
  scope: RoleScope;
  name: string;
  system: boolean;
  immutable: boolean;
  permissions: string[];
  memberCount: number;
  createdAt: string;
}

export interface CreateRoleRequest {
  name: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  permissions?: string[];
}

export interface MemberDto {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  roleId: string;
  roleName: string;
  isOwner: boolean;
  joinedAt: string;
}

export interface AddProjectMemberRequest {
  userId: string;
  roleId: string;
}

export interface AssignMemberRoleRequest {
  roleId: string;
}

export interface InvitationDto {
  id: string;
  workspaceId: string;
  projectId: string | null;
  type: InvitationType;
  email: string | null;
  token: string;
  roleId: string;
  roleName: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface CreateEmailInvitationRequest {
  email: string;
  roleId?: string;
  projectId?: string;
}

export interface CreateLinkInvitationRequest {
  roleId?: string;
  projectId?: string;
}

export interface InvitationPreviewDto {
  token: string;
  workspaceId: string;
  workspaceName: string;
  projectId: string | null;
  projectName: string | null;
  roleName: string;
  type: InvitationType;
  invitedEmail: string | null;
  status: InvitationStatus;
  expiresAt: string;
}

export interface AcceptInvitationResponse {
  workspaceId: string;
  projectId: string | null;
  roleName: string;
  alreadyMember: boolean;
}
