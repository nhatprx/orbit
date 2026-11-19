import { INITIAL_PROJECTS, INITIAL_WORKSPACES } from '../mocks/workspace.mock';
import type {
  CreateProjectPayload,
  OrbitProject,
  OrbitWorkspace,
  ProjectModuleId,
} from '../types/workspace.types';

export interface IWorkspaceService {
  listWorkspaces(): Promise<OrbitWorkspace[]>;
  listProjects(workspaceId: string): Promise<OrbitProject[]>;
  createProject(payload: CreateProjectPayload): Promise<OrbitProject>;
  toggleProjectModule(
    projectId: string,
    moduleId: ProjectModuleId
  ): Promise<OrbitProject | null>;
  deleteProject(projectId: string): Promise<void>;
}

let projects: OrbitProject[] = [...INITIAL_PROJECTS];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockWorkspaceService implements IWorkspaceService {
  async listWorkspaces(): Promise<OrbitWorkspace[]> {
    await delay(50);
    return [...INITIAL_WORKSPACES];
  }

  async listProjects(workspaceId: string): Promise<OrbitProject[]> {
    await delay(60);
    return projects.filter((p) => p.workspaceId === workspaceId);
  }

  async createProject(payload: CreateProjectPayload): Promise<OrbitProject> {
    await delay(100);
    const name = payload.name.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const created: OrbitProject = {
      id: `prj_${Date.now()}`,
      workspaceId: payload.workspaceId,
      name,
      slug: slug || 'new-project',
      description: payload.description.trim() || 'Independent project workspace.',
      enabledModules:
        payload.enabledModules.length > 0 ? payload.enabledModules : ['git'],
      memberCount: 1,
      updatedAt: 'Just now',
    };
    projects = [...projects, created];
    return created;
  }

  async toggleProjectModule(
    projectId: string,
    moduleId: ProjectModuleId
  ): Promise<OrbitProject | null> {
    let updated: OrbitProject | null = null;
    projects = projects.map((project) => {
      if (project.id !== projectId) return project;
      const exists = project.enabledModules.includes(moduleId);
      const nextModules = exists
        ? project.enabledModules.filter((m) => m !== moduleId)
        : [...project.enabledModules, moduleId];
      updated = { ...project, enabledModules: nextModules, updatedAt: 'Just now' };
      return updated;
    });
    return updated;
  }

  async deleteProject(projectId: string): Promise<void> {
    projects = projects.filter((p) => p.id !== projectId);
  }
}

export const workspaceService: IWorkspaceService = new MockWorkspaceService();
