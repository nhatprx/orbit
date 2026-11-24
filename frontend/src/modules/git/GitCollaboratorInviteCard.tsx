import { useEffect, useState } from 'react';
import { Check, Send, UserPlus, Users } from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { toast } from '../../components/ui/toastStore';
import { gitBasePath } from '../../services/git/gitApi';
import { apiRequest } from '../../services/workspace/httpClient';
import type {
  GitScope,
  GitWorkspaceMemberCandidateDto,
  InviteGitCollaboratorResultDto,
} from '../../types/git.types';

interface GitCollaboratorInviteCardProps {
  scope: GitScope;
  enableRemoteFetch?: boolean;
  initialCandidates?: GitWorkspaceMemberCandidateDto[];
}

export function GitCollaboratorInviteCard({
  scope,
  enableRemoteFetch = true,
  initialCandidates,
}: GitCollaboratorInviteCardProps) {
  const [candidates, setCandidates] = useState<GitWorkspaceMemberCandidateDto[]>(initialCandidates ?? []);
  const [loading, setLoading] = useState(Boolean(enableRemoteFetch && !initialCandidates));
  const [permission, setPermission] = useState<'pull' | 'push' | 'maintain' | 'admin'>('push');
  const [invitingUser, setInvitingUser] = useState<string | null>(null);
  const [invitedSet, setInvitedSet] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enableRemoteFetch || initialCandidates) return;
    let active = true;
    setLoading(true);
    apiRequest<GitWorkspaceMemberCandidateDto[]>('GET', `${gitBasePath(scope)}/collaborator-candidates`)
      .then((list) => { if (active) setCandidates(list); })
      .catch(() => { if (active) setCandidates([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [enableRemoteFetch, initialCandidates, scope]);

  async function handleInvite(githubUsername: string) {
    setInvitingUser(githubUsername);
    setError(null);
    try {
      await apiRequest<InviteGitCollaboratorResultDto>('POST', `${gitBasePath(scope)}/collaborators/invite`, {
        body: { githubUsername, permission },
      });
      setInvitedSet((prev) => new Set(prev).add(githubUsername.toLowerCase()));
      toast.success(`Invited @${githubUsername} (${permission}).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to invite @${githubUsername}`;
      setError(msg);
      toast.error(msg);
    } finally {
      setInvitingUser(null);
    }
  }

  return (
    <section className="flex flex-col border border-[#30363D] bg-[#161B22]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#E6EDF3]">
          <UserPlus className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <span>Add Collaborators</span>
        </div>
        <select
          aria-label="Collaborator permission"
          value={permission}
          onChange={(e) => setPermission(e.target.value as 'pull' | 'push' | 'maintain' | 'admin')}
          className="border border-[#30363D] bg-[#0D1117] px-2 py-1 font-mono text-[11px] text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
        >
          <option value="pull">Read (pull)</option>
          <option value="push">Write (push)</option>
          <option value="maintain">Maintain</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {error && (
        <div className="border-b border-[#EF4444] bg-[#0D1117] px-4 py-2 text-xs text-[#EF4444]">{error}</div>
      )}

      <div className="no-scrollbar max-h-72 divide-y divide-[#21262D] overflow-y-auto">
        {loading ? (
          <p className="px-4 py-5 text-xs text-[#8A8A8A]">Loading workspace members...</p>
        ) : candidates.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-5 text-xs text-[#8A8A8A]">
            <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>No workspace members found.</span>
          </div>
        ) : (
          candidates.map((m) => {
            const ghKey = (m.githubUsername ?? '').toLowerCase();
            const isInvited = Boolean(ghKey && invitedSet.has(ghKey));
            const disabled = !m.githubLinked;

            return (
              <div
                key={m.userId}
                aria-disabled={disabled}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs ${
                  disabled ? 'cursor-not-allowed bg-[#0D1117]/60 opacity-45' : 'bg-[#0D1117]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar name={m.displayName} avatarUrl={m.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#E6EDF3]">{m.displayName}</p>
                    <p className="truncate font-mono text-[10px] text-[#8B949E]">
                      {m.githubLinked && m.githubUsername ? `@${m.githubUsername}` : 'GitHub not linked'}
                    </p>
                  </div>
                </div>

                {disabled ? (
                  <span className="shrink-0 border border-[#30363D] bg-[#161B22] px-2 py-0.5 font-mono text-[10px] text-[#6E7681]">
                    Unavailable
                  </span>
                ) : m.alreadyCollaborator ? (
                  <span className="inline-flex shrink-0 items-center gap-1 border border-[#1E5631] bg-[#052E16] px-2 py-0.5 font-mono text-[10px] text-[#4ADE80]">
                    <Check className="h-3 w-3" strokeWidth={2} />Collaborator
                  </span>
                ) : isInvited ? (
                  <span className="inline-flex shrink-0 items-center gap-1 border border-[#1E5631] bg-[#052E16] px-2 py-0.5 font-mono text-[10px] text-[#4ADE80]">
                    <Check className="h-3 w-3" strokeWidth={2} />Invited
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={invitingUser === m.githubUsername}
                    onClick={() => { if (m.githubUsername) void handleInvite(m.githubUsername); }}
                    className="inline-flex shrink-0 items-center gap-1 border border-[#22C55E] bg-[#052E16] px-2.5 py-1 font-mono text-[11px] font-medium text-[#4ADE80] hover:bg-[#22C55E] hover:text-[#0D1117] disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" strokeWidth={1.5} />
                    {invitingUser === m.githubUsername ? 'Sending...' : 'Invite'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
