import type {
  ActivityRecord,
  PlatformMetric,
  UserWorkspace,
  WorkspaceAreaTile,
} from '../types/dashboard.types';

export const MOCK_USER_WORKSPACES: UserWorkspace[] = [
  { id: 'ws_orbit_core', name: 'orbit-core', slug: 'nhatprx/orbit-core', visibility: 'team', updatedAt: '2m ago' },
  { id: 'ws_ponytail', name: 'ponytail-cli', slug: 'nhatprx/ponytail-cli', visibility: 'private', updatedAt: '1h ago' },
  { id: 'ws_infra_aws', name: 'orbit-infra-aws', slug: 'nhatprx/orbit-infra-aws', visibility: 'team', updatedAt: '4h ago' },
  { id: 'ws_design_sys', name: 'orbit-design-system', slug: 'nhatprx/orbit-design-system', visibility: 'team', updatedAt: '1d ago' },
];

export const MOCK_WORKSPACE_AREAS: WorkspaceAreaTile[] = [
  { id: 'git', name: 'Git', status: 'pending', summary: 'Source control workspace area' },
  { id: 'mail', name: 'Mail', status: 'pending', summary: 'Developer messaging workspace area' },
  { id: 'docs', name: 'Docs', status: 'pending', summary: 'Structured document workspace area' },
  { id: 'sheets', name: 'Sheets', status: 'pending', summary: 'Grid calculation workspace area' },
  { id: 'chat', name: 'Chat', status: 'ready', summary: 'Real-time workspace and project messaging' },
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

