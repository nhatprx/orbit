import type { InvitationService } from './access.service';
import { ApiError, errorMessage } from './httpClient';
import { clearPendingInvite, readPendingInvite } from './pendingInvite';

export type InviteOutcome =
  | { status: 'none' }
  | { status: 'joined'; workspaceId: string; projectId: string | null }
  | { status: 'failed'; message: string };

/**
 * Called right after register, login or OAuth exchange (O-09). Accepts the invitation that was
 * saved before the user authenticated. Definitive failures clear the token; a network error
 * keeps it so the next sign-in can retry.
 */
export async function acceptPendingInvite(
  service: Pick<InvitationService, 'acceptInvitation'>
): Promise<InviteOutcome> {
  const token = readPendingInvite();
  if (!token) return { status: 'none' };
  try {
    const result = await service.acceptInvitation(token);
    clearPendingInvite();
    return { status: 'joined', workspaceId: result.workspaceId, projectId: result.projectId };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 0) clearPendingInvite();
    return { status: 'failed', message: errorMessage(error, 'The invitation could not be accepted.') };
  }
}
