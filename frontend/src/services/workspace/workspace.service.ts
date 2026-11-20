import type {
  CreateProjectRequest,
  CreateWorkspaceRequest,
  DeleteWorkspaceRequest,
  EffectiveModulesDto,
  ModuleCatalogItemDto,
  ModuleKey,
  PageResponse,
  ProjectDto,
  ProjectModuleDto,
  TransferOwnershipRequest,
  UpdateProjectRequest,
  UpdateWorkspaceRequest,
  WorkspaceDto,
  WorkspaceModuleDto,
} from '../../types/workspace.types';

export type { InvitationService, MemberService, RoleService } from './access.service';
export type { ChatService, LinkedAccountService, MailService } from './collab.service';

export interface WorkspaceService {
  listWorkspaces(options?: {
    includeDeleted?: boolean;
    page?: number;
    size?: number;
  }): Promise<PageResponse<WorkspaceDto>>;
  createWorkspace(request: CreateWorkspaceRequest): Promise<WorkspaceDto>;
  getWorkspace(workspaceId: string): Promise<WorkspaceDto>;
  updateWorkspace(
    workspaceId: string,
    request: UpdateWorkspaceRequest
  ): Promise<WorkspaceDto>;
  deleteWorkspace(
    workspaceId: string,
    request: DeleteWorkspaceRequest
  ): Promise<WorkspaceDto>;
  restoreWorkspace(workspaceId: string): Promise<WorkspaceDto>;
  transferOwnership(
    workspaceId: string,
    request: TransferOwnershipRequest
  ): Promise<WorkspaceDto>;
}

export interface ProjectService {
  listProjects(
    workspaceId: string,
    page?: number,
    size?: number
  ): Promise<PageResponse<ProjectDto>>;
  listMyProjects(page?: number, size?: number): Promise<PageResponse<ProjectDto>>;
  createProject(workspaceId: string, request: CreateProjectRequest): Promise<ProjectDto>;
  getProject(workspaceId: string, projectId: string): Promise<ProjectDto>;
  updateProject(
    workspaceId: string,
    projectId: string,
    request: UpdateProjectRequest
  ): Promise<ProjectDto>;
  deleteProject(workspaceId: string, projectId: string): Promise<void>;
}

export interface ModuleService {
  listCatalog(): Promise<ModuleCatalogItemDto[]>;
  listWorkspaceModules(workspaceId: string): Promise<WorkspaceModuleDto[]>;
  setWorkspaceModule(
    workspaceId: string,
    moduleKey: ModuleKey,
    enabled: boolean
  ): Promise<WorkspaceModuleDto>;
  listProjectModules(workspaceId: string, projectId: string): Promise<ProjectModuleDto[]>;
  setProjectModule(
    workspaceId: string,
    projectId: string,
    moduleKey: ModuleKey,
    enabled: boolean
  ): Promise<ProjectModuleDto>;
  getEffectiveModules(workspaceId: string, projectId?: string): Promise<EffectiveModulesDto>;
}
