import { ArrowLeft, Check, LogIn, UserPlus, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useResource } from '../../hooks/useResource';
import { invitationService } from '../../services/workspace/services';
import type { AuthSession } from '../../types/auth.types';
import type { InvitationStatus } from '../../types/workspace.types';
import { formatDate } from '../../utils/format';

interface InviteAcceptPageProps {
  token: string;
  session: AuthSession | null;
  onJoined: (workspaceId: string) => void;
  onNeedAuth: (mode: 'login' | 'register') => void;
  onClose: () => void;
}

const UNUSABLE: Record<Exclude<InvitationStatus, 'PENDING'>, string> = {
  ACCEPTED: 'This invitation was already used.',
  DECLINED: 'This invitation was declined.',
  REVOKED: 'This invitation was revoked by a workspace admin.',
  EXPIRED: 'This invitation has expired. Ask for a new one.',
};

/** Landing page for /invite/:token (public preview, then accept after authentication). */
export function InviteAcceptPage({ token, session, onJoined, onNeedAuth, onClose }: InviteAcceptPageProps) {
  const preview = useResource(() => invitationService.previewInvitation(token), [token]);
  const accept = useAsyncAction(async () => {
    const result = await invitationService.acceptInvitation(token);
    onJoined(result.workspaceId);
  });
  const decline = useAsyncAction(async () => {
    await invitationService.declineInvitation(token);
    onClose();
  });
  const data = preview.data;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D1117] px-4 py-12 text-[#E6EDF3]">
      <div className="w-full max-w-md border border-[#30363D] bg-[#161B22] p-6">
        <button type="button" onClick={onClose} className="mb-6 inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#22C55E]">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back to Orbit
        </button>
        <h1 className="mb-1 text-xl font-semibold tracking-tight">Workspace invitation</h1>

        {preview.loading && !data && <LoadingView label="Checking invitation..." />}
        {preview.error && <ErrorView message="This invitation link is not valid." />}

        {data && (
          <div className="mt-4 space-y-4">
            <p className="text-[13px] text-[#BDBDBD]">
              You were invited to join <span className="font-semibold text-[#E6EDF3]">{data.workspaceName}</span>
              {data.projectName && (
                <>
                  {' '}and the project <span className="font-semibold text-[#E6EDF3]">{data.projectName}</span>
                </>
              )}
              .
            </p>
            <dl className="divide-y divide-[#30363D] border border-[#30363D] text-[13px]">
              <div className="flex justify-between px-3 py-2">
                <dt className="text-[#8B949E]">Role</dt>
                <dd>{data.roleName}</dd>
              </div>
              {data.invitedEmail && (
                <div className="flex justify-between gap-4 px-3 py-2">
                  <dt className="text-[#8B949E]">Sent to</dt>
                  <dd className="truncate">{data.invitedEmail}</dd>
                </div>
              )}
              <div className="flex justify-between px-3 py-2">
                <dt className="text-[#8B949E]">Expires</dt>
                <dd className="font-mono text-xs">{formatDate(data.expiresAt)}</dd>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <dt className="text-[#8B949E]">Status</dt>
                <dd>
                  <Badge tone={data.status === 'PENDING' ? 'green' : 'warning'} withDot>
                    {data.status}
                  </Badge>
                </dd>
              </div>
            </dl>

            {data.status !== 'PENDING' ? (
              <p role="alert" className="text-xs text-[#EAB308]">
                {UNUSABLE[data.status]}
              </p>
            ) : session ? (
              <div className="space-y-3">
                {(accept.error ?? decline.error) && (
                  <p role="alert" className="text-xs text-[#EF4444]">
                    {accept.error ?? decline.error}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="primary" disabled={accept.pending} onClick={() => void accept.run()}>
                    <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {accept.pending ? 'Joining...' : 'Accept invitation'}
                  </Button>
                  {data.type === 'EMAIL' && (
                    <Button type="button" variant="secondary" disabled={decline.pending} onClick={() => void decline.run()}>
                      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Decline
                    </Button>
                  )}
                </div>
                <p className="text-xs text-[#7D8590]">Signed in as {session.user.email}.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#8B949E]">Sign in or create an account. You join automatically afterwards.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="primary" onClick={() => onNeedAuth('login')}>
                    <LogIn className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Sign in
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => onNeedAuth('register')}>
                    <UserPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Create account
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
