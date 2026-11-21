export * from './workspace-access.types';
export * from './workspace-collab.types';

export type ModuleKey = 'git' | 'docs' | 'sheets' | 'chat' | 'cloud' | 'issues';

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CursorPageResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface ApiFieldError {
  field: string;
  reason: string;
}

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  traceId: string;
  timestamp: string;
  details: ApiFieldError[];
}

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  memberCount: number;
  projectCount: number;
  enabledModules: ModuleKey[];
  myPermissions: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  purgeAfter: string | null;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  avatarUrl?: string;
  moduleKeys: ModuleKey[];
  inviteEmails?: string[];
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface DeleteWorkspaceRequest {
  confirmName: string;
}

export interface TransferOwnershipRequest {
  targetUserId: string;
}

export interface ProjectDto {
  id: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  enabledModules: ModuleKey[];
  myPermissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface ModuleCatalogItemDto {
  key: ModuleKey;
  name: string;
  description: string;
}

export interface WorkspaceModuleDto {
  key: ModuleKey;
  name: string;
  description: string;
  enabled: boolean;
  activeProjectCount: number;
}

export interface ProjectModuleDto {
  key: ModuleKey;
  name: string;
  description: string;
  enabledInWorkspace: boolean;
  enabledInProject: boolean;
  effectiveEnabled: boolean;
}

export interface EffectiveModulesDto {
  scope: 'WORKSPACE' | 'PROJECT';
  modules: ModuleCatalogItemDto[];
}
