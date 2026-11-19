import type { AuthUser } from '../types/auth.types';

export interface MockCredentialRecord {
  user: AuthUser;
  password: string;
}

export const MOCK_USERS: MockCredentialRecord[] = [
  {
    password: 'orbit-admin-dev',
    user: {
      id: 'usr_admin_01',
      name: 'Alex Mercer',
      email: 'admin@orbit.dev',
      role: 'admin',
      workspaceId: 'ws_orbit_core',
    },
  },
  {
    password: 'orbit-user-dev',
    user: {
      id: 'usr_dev_01',
      name: 'Taylor Lin',
      email: 'user@orbit.dev',
      role: 'user',
      workspaceId: 'ws_orbit_core',
    },
  },
];
