import { MOCK_CONTRIBUTION_GRID, MOCK_PINNED_ITEMS } from '../mocks/profile.mock';
import type { AuthUser } from '../types/auth.types';
import type { ProfileData, ProfileUpdatePayload } from '../types/profile.types';

const STORAGE_PREFIX = 'orbit_profile_';

export interface IProfileService {
  getProfile(user: AuthUser): Promise<ProfileData>;
  updateProfile(user: AuthUser, payload: ProfileUpdatePayload): Promise<ProfileData>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildDefaultProfile(user: AuthUser): ProfileData {
  const username = user.username ?? user.email.split('@')[0] ?? 'developer';
  return {
    name: user.name,
    username,
    bio: 'Building high-scale developer tools and minimal workspace systems on Orbit.',
    organization: user.workspaceId,
    location: user.country ?? 'Vietnam',
    website: 'https://nhatprx.com',
    joinedDate: 'Joined Nov 2026',
    followers: 42,
    following: 18,
    pinned: MOCK_PINNED_ITEMS,
    contributions: MOCK_CONTRIBUTION_GRID,
  };
}

class MockProfileService implements IProfileService {
  async getProfile(user: AuthUser): Promise<ProfileData> {
    await delay(120);
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${user.id}`);
    const base = buildDefaultProfile(user);
    if (!saved) return base;
    try {
      const overrides = JSON.parse(saved) as Partial<ProfileUpdatePayload>;
      return { ...base, ...overrides };
    } catch {
      return base;
    }
  }

  async updateProfile(
    user: AuthUser,
    payload: ProfileUpdatePayload
  ): Promise<ProfileData> {
    await delay(150);
    localStorage.setItem(`${STORAGE_PREFIX}${user.id}`, JSON.stringify(payload));
    return { ...buildDefaultProfile(user), ...payload };
  }
}

export const profileService: IProfileService = new MockProfileService();
