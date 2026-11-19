import type {
  ActivityRecord,
  DirectoryUser,
  PlatformMetric,
  WorkspaceAreaTile,
} from '../types/dashboard.types';

export const MOCK_WORKSPACE_AREAS: WorkspaceAreaTile[] = [
  { id: 'git', name: 'Git', status: 'pending', summary: 'Source control workspace area' },
  { id: 'mail', name: 'Mail', status: 'pending', summary: 'Developer messaging workspace area' },
  { id: 'docs', name: 'Docs', status: 'pending', summary: 'Structured document workspace area' },
  { id: 'sheets', name: 'Sheets', status: 'pending', summary: 'Grid calculation workspace area' },
  { id: 'ppt', name: 'Presentations', status: 'pending', summary: 'Slide deck workspace area' },
  { id: 'markdown', name: 'Markdown', status: 'pending', summary: 'Technical notes workspace area' },
];

export const MOCK_RECENT_ACTIVITY: ActivityRecord[] = [
  { id: 'act_01', actor: 'Alex Mercer', area: 'Platform', action: 'Initialized core workspace environment', timestamp: '2m ago' },
  { id: 'act_02', actor: 'Taylor Lin', area: 'Design', action: 'Verified square border tokens', timestamp: '14m ago' },
  { id: 'act_03', actor: 'Alex Mercer', area: 'Governance', action: 'Passed ponytail LOC compliance check', timestamp: '28m ago' },
  { id: 'act_04', actor: 'Taylor Lin', area: 'Workspace', action: 'Switched active session to ws_orbit_core', timestamp: '1h ago' },
];

export const MOCK_PLATFORM_METRICS: PlatformMetric[] = [
  { id: 'm_ccu', label: 'Target CCU Capacity', value: '10,000+', state: 'healthy' },
  { id: 'm_pg', label: 'PostgreSQL Pool', value: 'ONLINE', state: 'healthy' },
  { id: 'm_redis', label: 'Redis Session Store', value: 'ONLINE', state: 'healthy' },
  { id: 'm_aws', label: 'AWS Docker Target', value: 'READY', state: 'healthy' },
];

export const MOCK_DIRECTORY_USERS: DirectoryUser[] = [
  { id: 'usr_admin_01', name: 'Alex Mercer', email: 'admin@orbit.dev', role: 'admin', status: 'active' },
  { id: 'usr_dev_01', name: 'Taylor Lin', email: 'user@orbit.dev', role: 'user', status: 'active' },
  { id: 'usr_dev_02', name: 'Jordan Vance', email: 'jordan@orbit.dev', role: 'user', status: 'active' },
  { id: 'usr_dev_03', name: 'Samira Patel', email: 'samira@orbit.dev', role: 'user', status: 'invited' },
];
