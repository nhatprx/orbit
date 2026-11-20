import { useState } from 'react';
import { Check, Copy, Link2, Mail, Ban } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { InvitationDto, InvitationStatus } from '../../types/workspace.types';
import { formatDate } from '../../utils/format';

const STATUS_TONE: Record<InvitationStatus, 'green' | 'neutral' | 'warning' | 'danger'> = {
  PENDING: 'green',
  ACCEPTED: 'neutral',
  DECLINED: 'neutral',
  REVOKED: 'danger',
  EXPIRED: 'warning',
};

export function inviteUrl(token: string, origin: string = window.location.origin): string {
  return `${origin}/invite/${encodeURIComponent(token)}`;
}

interface InvitationsTableProps {
  invitations: InvitationDto[];
  canRevoke: boolean;
  onRevoke: (invitation: InvitationDto) => void;
}

export function InvitationsTable({ invitations, canRevoke, onRevoke }: InvitationsTableProps) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(invitation: InvitationDto) {
    try {
      await navigator.clipboard.writeText(inviteUrl(invitation.token));
      setCopied(invitation.id);
      window.setTimeout(() => setCopied((c) => (c === invitation.id ? null : c)), 1500);
    } catch {
      setCopied(null);
    }
  }

  if (invitations.length === 0) {
    return <p className="border border-dashed border-[#30363D] p-6 text-center text-xs text-[#8B949E]">No invitations yet.</p>;
  }

  return (
    <div className="overflow-x-auto border border-[#30363D]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#30363D] bg-[#0D1117] text-left text-[#8B949E]">
            <th scope="col" className="px-3 py-2 font-medium">Invitation</th>
            <th scope="col" className="px-3 py-2 font-medium">Role</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 font-medium">Expires</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((invitation) => {
            const Icon = invitation.type === 'EMAIL' ? Mail : Link2;
            const live = invitation.status === 'PENDING';
            return (
              <tr key={invitation.id} className="border-t border-[#30363D]">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2 text-[#E6EDF3]">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[#8B949E]" strokeWidth={1.5} />
                    <span className="truncate">{invitation.email ?? 'Invite link'}</span>
                    {invitation.projectId && <Badge tone="neutral">Project</Badge>}
                  </span>
                </td>
                <td className="px-3 py-2 text-[#BDBDBD]">{invitation.roleName}</td>
                <td className="px-3 py-2">
                  <Badge tone={STATUS_TONE[invitation.status]} withDot>
                    {invitation.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-[#8B949E]">{formatDate(invitation.expiresAt)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1.5">
                    {live && (
                      <Button type="button" variant="ghost" onClick={() => void copy(invitation)}>
                        {copied === invitation.id ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ) : (
                          <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                        {copied === invitation.id ? 'Copied' : 'Copy link'}
                      </Button>
                    )}
                    {live && canRevoke && (
                      <Button type="button" variant="ghost" onClick={() => onRevoke(invitation)}>
                        <Ban className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Revoke
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
