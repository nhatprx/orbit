import { useState } from 'react';
import { ArrowRight, Check, Copy, Terminal } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { GitRepositoryDto, GitScope } from '../../types/git.types';
import { GitCollaboratorInviteCard } from './GitCollaboratorInviteCard';

interface GitQuickSetupPanelProps {
  repo: GitRepositoryDto;
  scope: GitScope;
  canManage: boolean;
  enableRemoteFetch?: boolean;
  onContinue?: () => void;
}

export function GitQuickSetupPanel({
  repo,
  scope,
  canManage,
  enableRemoteFetch = true,
  onContinue,
}: GitQuickSetupPanelProps) {
  const [protocol, setProtocol] = useState<'https' | 'ssh'>('https');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const httpsUrl = repo.cloneUrl || `https://github.com/${repo.slug}.git`;
  const sshUrl = `git@github.com:${repo.slug}.git`;
  const remoteUrl = protocol === 'https' ? httpsUrl : sshUrl;
  const branch = repo.defaultBranch || 'main';

  const newRepoCmd = [
    `echo "# ${repo.repoName}" >> README.md`,
    'git init',
    'git add README.md',
    'git commit -m "first commit"',
    `git branch -M ${branch}`,
    `git remote add origin ${remoteUrl}`,
    `git push -u origin ${branch}`,
  ].join('\n');

  const existingRepoCmd = [
    `git remote add origin ${remoteUrl}`,
    `git branch -M ${branch}`,
    `git push -u origin ${branch}`,
  ].join('\n');

  async function copyText(id: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-[#1E5631] bg-[#052E16]/30 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-[#E6EDF3]">
              Quick Setup — <span className="font-mono text-[#4ADE80]">{repo.slug}</span>
            </p>
            <p className="text-xs text-[#8B949E]">
              Push your code from the command line or invite workspace teammates below.
            </p>
          </div>
        </div>
        {onContinue && (
          <Button type="button" variant="primary" onClick={onContinue}>
            Continue to Repository
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <section className={`border border-[#30363D] bg-[#161B22] ${canManage ? 'xl:col-span-7' : 'xl:col-span-12'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] px-4 py-2.5">
            <div className="inline-flex border border-[#30363D] bg-[#0D1117] font-mono text-[11px]">
              <button type="button" onClick={() => setProtocol('https')} className={`px-2.5 py-1 ${protocol === 'https' ? 'bg-[#21262D] text-[#4ADE80]' : 'text-[#8A8A8A] hover:text-[#E6EDF3]'}`}>
                HTTPS
              </button>
              <button type="button" onClick={() => setProtocol('ssh')} className={`border-l border-[#30363D] px-2.5 py-1 ${protocol === 'ssh' ? 'bg-[#21262D] text-[#4ADE80]' : 'text-[#8A8A8A] hover:text-[#E6EDF3]'}`}>
                SSH
              </button>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <code className="min-w-0 flex-1 truncate border border-[#30363D] bg-[#0D1117] px-2.5 py-1 font-mono text-xs text-[#E6EDF3]">
                {remoteUrl}
              </code>
              <button type="button" onClick={() => void copyText('url', remoteUrl)} className="inline-flex shrink-0 items-center gap-1 border border-[#30363D] bg-[#0D1117] px-2.5 py-1 font-mono text-[11px] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]">
                {copiedId === 'url' ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === 'url' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#E6EDF3]">...or create a new repository on the command line</span>
                <button type="button" onClick={() => void copyText('new', newRepoCmd)} className="inline-flex items-center gap-1 font-mono text-[11px] text-[#8B949E] hover:text-[#4ADE80]">
                  {copiedId === 'new' ? <Check className="h-3 w-3 text-[#22C55E]" /> : <Copy className="h-3 w-3" />}
                  {copiedId === 'new' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="no-scrollbar overflow-x-auto border border-[#30363D] bg-[#0D1117] p-3 font-mono text-xs leading-relaxed text-[#E6EDF3]">
                {newRepoCmd}
              </pre>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#E6EDF3]">...or push an existing repository from the command line</span>
                <button type="button" onClick={() => void copyText('existing', existingRepoCmd)} className="inline-flex items-center gap-1 font-mono text-[11px] text-[#8B949E] hover:text-[#4ADE80]">
                  {copiedId === 'existing' ? <Check className="h-3 w-3 text-[#22C55E]" /> : <Copy className="h-3 w-3" />}
                  {copiedId === 'existing' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="no-scrollbar overflow-x-auto border border-[#30363D] bg-[#0D1117] p-3 font-mono text-xs leading-relaxed text-[#E6EDF3]">
                {existingRepoCmd}
              </pre>
            </div>
          </div>
        </section>

        {canManage && (
          <div className="xl:col-span-5">
            <GitCollaboratorInviteCard scope={scope} enableRemoteFetch={enableRemoteFetch} />
          </div>
        )}
      </div>
    </div>
  );
}
