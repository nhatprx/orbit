import {
  MOCK_DIRECTORY_USERS,
  MOCK_PLATFORM_METRICS,
  MOCK_RECENT_ACTIVITY,
  MOCK_USER_WORKSPACES,
  MOCK_WORKSPACE_AREAS,
} from '../mocks/dashboard.mock';
import type {
  ActivityRecord,
  DirectoryUser,
  PlatformMetric,
  UserWorkspace,
  WorkspaceAreaTile,
} from '../types/dashboard.types';

export interface IDashboardService {
  getUserWorkspaces(limit?: number): Promise<UserWorkspace[]>;
  getWorkspaceAreas(): Promise<WorkspaceAreaTile[]>;
  getRecentActivity(limit?: number): Promise<ActivityRecord[]>;
  getPlatformMetrics(): Promise<PlatformMetric[]>;
  getDirectoryUsers(limit?: number): Promise<DirectoryUser[]>;
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

  async getDirectoryUsers(limit = 25): Promise<DirectoryUser[]> {
    await delay(160);
    return MOCK_DIRECTORY_USERS.slice(0, limit);
  }
}

export const dashboardService: IDashboardService = new MockDashboardService();
