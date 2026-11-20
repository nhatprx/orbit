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
import { apiRequest, seg } from './httpClient';
import type { ModuleService, ProjectService, WorkspaceService } from './workspace.service';

const WS = '/api/v1/workspaces';

class HttpWorkspaceService implements WorkspaceService {
  listWorkspaces(options: { includeDeleted?: boolean; page?: number; size?: number } = {}) {
    return apiRequest<PageResponse<WorkspaceDto>>('GET', WS, {
      query: { includeDeleted: options.includeDeleted, page: options.page, size: options.size },
    });
  }

  createWorkspace(request: CreateWorkspaceRequest) {
    return apiRequest<WorkspaceDto>('POST', WS, { body: request });
  }

  getWorkspace(workspaceId: string) {
    return apiRequest<WorkspaceDto>('GET', `${WS}/${seg(workspaceId)}`);
  }

  updateWorkspace(workspaceId: string, request: UpdateWorkspaceRequest) {
    return apiRequest<WorkspaceDto>('PATCH', `${WS}/${seg(workspaceId)}`, { body: request });
  }

  deleteWorkspace(workspaceId: string, request: DeleteWorkspaceRequest) {
    return apiRequest<WorkspaceDto>('DELETE', `${WS}/${seg(workspaceId)}`, { body: request });
  }

  restoreWorkspace(workspaceId: string) {
    return apiRequest<WorkspaceDto>('POST', `${WS}/${seg(workspaceId)}/restore`);
  }

  transferOwnership(workspaceId: string, request: TransferOwnershipRequest) {
    return apiRequest<WorkspaceDto>('POST', `${WS}/${seg(workspaceId)}/transfer-ownership`, {
      body: request,
    });
  }
}

class HttpProjectService implements ProjectService {
  listProjects(workspaceId: string, page?: number, size?: number) {
    return apiRequest<PageResponse<ProjectDto>>('GET', `${WS}/${seg(workspaceId)}/projects`, {
      query: { page, size },
    });
  }

  listMyProjects(page?: number, size?: number) {
    return apiRequest<PageResponse<ProjectDto>>('GET', '/api/v1/projects/mine', {
      query: { page, size },
    });
  }

  createProject(workspaceId: string, request: CreateProjectRequest) {
    return apiRequest<ProjectDto>('POST', `${WS}/${seg(workspaceId)}/projects`, { body: request });
  }

  getProject(workspaceId: string, projectId: string) {
    return apiRequest<ProjectDto>('GET', `${WS}/${seg(workspaceId)}/projects/${seg(projectId)}`);
  }

  updateProject(workspaceId: string, projectId: string, request: UpdateProjectRequest) {
    return apiRequest<ProjectDto>('PATCH', `${WS}/${seg(workspaceId)}/projects/${seg(projectId)}`, {
      body: request,
    });
  }

  deleteProject(workspaceId: string, projectId: string) {
    return apiRequest<void>('DELETE', `${WS}/${seg(workspaceId)}/projects/${seg(projectId)}`);
  }
}

class HttpModuleService implements ModuleService {
  listCatalog() {
    return apiRequest<ModuleCatalogItemDto[]>('GET', '/api/v1/modules');
  }

  listWorkspaceModules(workspaceId: string) {
    return apiRequest<WorkspaceModuleDto[]>('GET', `${WS}/${seg(workspaceId)}/modules`);
  }

  setWorkspaceModule(workspaceId: string, moduleKey: ModuleKey, enabled: boolean) {
    return apiRequest<WorkspaceModuleDto>('PUT', `${WS}/${seg(workspaceId)}/modules/${seg(moduleKey)}`, {
      body: { enabled },
    });
  }

  listProjectModules(workspaceId: string, projectId: string) {
    return apiRequest<ProjectModuleDto[]>(
      'GET',
      `${WS}/${seg(workspaceId)}/projects/${seg(projectId)}/modules`
    );
  }

  setProjectModule(workspaceId: string, projectId: string, moduleKey: ModuleKey, enabled: boolean) {
    return apiRequest<ProjectModuleDto>(
      'PUT',
      `${WS}/${seg(workspaceId)}/projects/${seg(projectId)}/modules/${seg(moduleKey)}`,
      { body: { enabled } }
    );
  }

  getEffectiveModules(workspaceId: string, projectId?: string) {
    return apiRequest<EffectiveModulesDto>('GET', `${WS}/${seg(workspaceId)}/effective-modules`, {
      query: { projectId },
    });
  }
}

export const httpWorkspaceService: WorkspaceService = new HttpWorkspaceService();
export const httpProjectService: ProjectService = new HttpProjectService();
export const httpModuleService: ModuleService = new HttpModuleService();
