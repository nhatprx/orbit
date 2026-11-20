/** Remembers an invitation token across registration, login and OAuth redirects (O-09). */
export const PENDING_INVITE_KEY = 'orbit_pending_invite_token';

export function savePendingInvite(token: string): void {
  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, token);
  } catch {
    // Storage can be unavailable in private modes; the user can reopen the link.
  }
}

export function readPendingInvite(): string | null {
  try {
    return sessionStorage.getItem(PENDING_INVITE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Extracts the token from /invite/<token>; returns null for any other path. */
export function parseInviteToken(pathname: string): string | null {
  const match = /^\/invite\/([^/?#]+)\/?$/.exec(pathname);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
