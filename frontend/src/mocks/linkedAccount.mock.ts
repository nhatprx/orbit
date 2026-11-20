import type { SocialProvider } from '../types/workspace.types';

export const SOCIAL_PROVIDERS: { id: SocialProvider; label: string; summary: string }[] = [
  { id: 'google', label: 'Google', summary: 'Sign in with your Google account' },
  { id: 'github', label: 'GitHub', summary: 'Sign in with your GitHub account' },
];

/** Builds the identity a real OAuth consent screen would return for the current user. */
export function mockProviderIdentity(
  provider: SocialProvider,
  handle: string
): { providerUserId: string; providerEmail: string; displayName: string } {
  const safeHandle = handle.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user';
  return provider === 'google'
    ? {
        providerUserId: `google-${safeHandle}`,
        providerEmail: `${safeHandle}@gmail.com`,
        displayName: safeHandle,
      }
    : {
        providerUserId: `github-${safeHandle}`,
        providerEmail: `${safeHandle}@users.noreply.github.com`,
        displayName: safeHandle,
      };
}
