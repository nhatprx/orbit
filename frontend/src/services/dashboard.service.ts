import {
  MOCK_PLATFORM_METRICS,
  MOCK_RECENT_ACTIVITY,
  MOCK_USER_WORKSPACES,
  MOCK_WORKSPACE_AREAS,
} from '../mocks/dashboard.mock';
import type {
  ActivityRecord,
  PlatformMetric,
  UserWorkspace,
  WorkspaceAreaTile,
} from '../types/dashboard.types';

export interface IDashboardService {
  getUserWorkspaces(limit?: number): Promise<UserWorkspace[]>;
  getWorkspaceAreas(): Promise<WorkspaceAreaTile[]>;
  getRecentActivity(limit?: number): Promise<ActivityRecord[]>;
  getPlatformMetrics(): Promise<PlatformMetric[]>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockDashboardService implements IDashboardService {
  async getUserWorkspaces(limit = 20): Promise<UserWorkspace[]> {
    await delay(100);
    return MOCK_USER_WORKSPACES.slice(0, limit);
  }
  async getWorkspaceAreas(): Promise<WorkspaceAreaTile[]> {
    await delay(120);
    return MOCK_WORKSPACE_AREAS;
  }

  async getRecentActivity(limit = 10): Promise<ActivityRecord[]> {
    await delay(140);
    return MOCK_RECENT_ACTIVITY.slice(0, limit);
  }

  async getPlatformMetrics(): Promise<PlatformMetric[]> {
    await delay(140);
    return MOCK_PLATFORM_METRICS;
  }
}

export const dashboardService: IDashboardService = new MockDashboardService();
