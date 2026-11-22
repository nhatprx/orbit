import type { UserRole } from './auth.types';

export type WorkspaceAreaId =
  | 'overview'
  | 'ai'
  | 'profile'
  | 'workspace-settings'
  | 'project-settings'
  | 'git'
  | 'docs'
  | 'sheets'
  | 'slides'
  | 'chat'
  | 'mail'
  | 'cloud'
  | 'issues'
  | 'whiteboard'
  | 'personal-cloud'
  | 'admin';

/** Tabs inside the Profile area (D-10, O-08). */
export type ProfileSectionId = 'overview' | 'workspaces' | 'projects' | 'settings';

export interface WorkspaceAreaTile {
  id: Exclude<WorkspaceAreaId, 'overview' | 'admin'>;
  name: string;
  status: 'ready' | 'pending';
  summary: string;
}

export interface ActivityRecord {
  id: string;
  actor: string;
  area: string;
  action: string;
  timestamp: string;
}

export interface PlatformMetric {
  id: string;
  label: string;
  value: string;
  state: 'healthy' | 'warning';
}

export interface UserWorkspace {
  id: string;
  name: string;
  slug: string;
  visibility: 'private' | 'team';
  updatedAt: string;
}

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'invited';
}
