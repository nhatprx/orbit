import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { invitationService } from '../../services/workspace/services';
import type { ProjectDto, RoleDto, WorkspaceDto } from '../../types/workspace.types';
import { inviteUrl } from './InvitationsTable';
import { can } from './permissionCatalog';

interface ProjectInviteLinkProps {
  workspace: WorkspaceDto;
  project: ProjectDto;
  roles: RoleDto[];
}

/** Creates a reusable link that adds people to this project with its default Member role. */
export function ProjectInviteLink({ workspace, project, roles }: ProjectInviteLinkProps) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const memberRole = roles.find((r) => r.name === 'Member') ?? roles[0];

  const create = useAsyncAction(async () => {
    const invitation = await invitationService.createLinkInvitation(workspace.id, {
      projectId: project.id,
      ...(memberRole ? { roleId: memberRole.id } : {}),
    });
    setLink(inviteUrl(invitation.token));
    setCopied(false);
  });

  if (!can(workspace.myPermissions, 'member.invite')) return null;

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 border-t border-[#30363D] pt-4">
      <p className="mb-2 text-xs text-[#8B949E]">
        Invite someone who is not in the workspace yet. The link adds them to the workspace and to this project.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" disabled={create.pending} onClick={() => void create.run()}>
          <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          {create.pending ? 'Creating...' : 'Create project invite link'}
        </Button>
        {link && (
          <>
            <input
              readOnly
              aria-label="Project invite link"
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-64 flex-1 border border-[#3B434B] bg-[#0D1117] px-2 py-1.5 font-mono text-xs text-[#E6EDF3]"
            />
            <Button type="button" variant="ghost" onClick={() => void copy()}>
              {copied ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </>
        )}
      </div>
      {create.error && (
        <p role="alert" className="mt-2 text-xs text-[#EF4444]">
          {create.error}
        </p>
      )}
    </div>
  );
}
