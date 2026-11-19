export type ProjectModuleId =
  | 'git'
  | 'mail'
  | 'cloud'
  | 'chat'
  | 'docs'
  | 'sheets'
  | 'ppt'
  | 'markdown';

export interface OrbitWorkspace {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
}

export interface OrbitProject {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string;
  enabledModules: ProjectModuleId[];
  memberCount: number;
  updatedAt: string;
}

export interface CreateProjectPayload {
  workspaceId: string;
  name: string;
  description: string;
  enabledModules: ProjectModuleId[];
}
