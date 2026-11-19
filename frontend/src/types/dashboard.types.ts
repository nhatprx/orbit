import type { UserRole } from './auth.types';

export type WorkspaceAreaId =
  | 'overview'
  | 'git'
  | 'mail'
  | 'docs'
  | 'sheets'
  | 'ppt'
  | 'markdown'
  | 'admin';

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

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'invited';
}
