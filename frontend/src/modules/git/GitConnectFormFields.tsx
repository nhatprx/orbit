import { useMemo, useState } from 'react';
import { Check, GitBranch, Globe, Lock, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { GitHubRemoteRepoDto } from '../../types/git.types';

interface GitConnectFormFieldsProps {
  mode: 'connect' | 'create';
  repositories: GitHubRemoteRepoDto[];
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  privateRepo: boolean;
  autoInit: boolean;
  gitignoreTemplate: string;
  licenseTemplate: string;
  canSubmit: boolean;
  submitting: boolean;
  onSelectRemote: (fullName: string) => void;
  onChangeName: (value: string) => void;
  onChangePrivate: (value: boolean) => void;
  onChangeAutoInit: (value: boolean) => void;
  onChangeGitignore: (value: string) => void;
  onChangeLicense: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const INPUT_CLASS =
  'w-full border border-[#30363D] bg-[#0D1117] px-3 py-2 text-xs text-[#E6EDF3] placeholder-[#6E7681] focus:border-[#22C55E] focus:outline-none';

const GITIGNORE_OPTIONS = ['', 'Node', 'Java', 'Python', 'Go', 'Rust', 'Android', 'Swift'];
const LICENSE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'mit', label: 'MIT License' },
  { value: 'apache-2.0', label: 'Apache License 2.0' },
  { value: 'gpl-3.0', label: 'GNU GPLv3' },
  { value: 'bsd-3-clause', label: 'BSD 3-Clause' },
  { value: 'mpl-2.0', label: 'Mozilla Public License 2.0' },
];

export function GitConnectFormFields({
  mode, repositories, repoOwner, repoName, defaultBranch, privateRepo,
  autoInit, gitignoreTemplate, licenseTemplate, canSubmit, submitting,
  onSelectRemote, onChangeName, onChangePrivate, onChangeAutoInit,
  onChangeGitignore, onChangeLicense, onSubmit,
}: GitConnectFormFieldsProps) {
  const [search, setSearch] = useState('');
  const selectedFull = repoOwner && repoName ? `${repoOwner}/${repoName}` : '';

  const filteredRepos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? repositories.filter((r) => r.fullName.toLowerCase().includes(q)) : repositories;
  }, [repositories, search]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === 'connect' ? (
        <div className="space-y-2.5">
          <div className="relative border border-[#30363D] bg-[#0D1117]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E7681]" strokeWidth={1.5} />
            <input type="text" aria-label="Search repositories" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search repositories..." className="w-full bg-transparent py-2 pl-8 pr-3 font-mono text-xs text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none" />
          </div>

          <div className="no-scrollbar max-h-60 divide-y divide-[#21262D] overflow-y-auto border border-[#30363D] bg-[#0D1117]">
            {filteredRepos.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#8A8A8A]">No matching repositories found.</p>
            ) : (
              filteredRepos.map((r) => {
                const selected = r.fullName.toLowerCase() === selectedFull.toLowerCase();
                return (
                  <button key={r.fullName} type="button" onClick={() => onSelectRemote(r.fullName)} className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors ${selected ? 'border-l-2 border-l-[#22C55E] bg-[#161B22]' : 'border-l-2 border-l-transparent hover:bg-[#161B22]/60'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        {r.privateRepo ? <Lock className="h-3 w-3 shrink-0 text-[#8A8A8A]" strokeWidth={1.5} /> : <Globe className="h-3 w-3 shrink-0 text-[#8A8A8A]" strokeWidth={1.5} />}
                        <span className="truncate text-[#8B949E]">{r.owner}/</span>
                        <span className="truncate font-semibold text-[#E6EDF3]">{r.name}</span>
                      </div>
                      {r.description && <p className="mt-0.5 truncate pl-4 text-[11px] text-[#6E7681]">{r.description}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 font-mono text-[10px]">
                      <span className="inline-flex items-center gap-1 text-[#8B949E]"><GitBranch className="h-3 w-3" strokeWidth={1.5} />{r.defaultBranch || 'main'}</span>
                      {selected && <Check className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={2} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 border border-[#30363D] bg-[#0D1117] p-4">
          <div>
            <label htmlFor="git-create-name" className="mb-1 block text-xs text-[#BDBDBD]">New Repository Name</label>
            <input id="git-create-name" value={repoName} onChange={(e) => onChangeName(e.target.value)} placeholder="orbit-service" required className={`${INPUT_CLASS} font-mono`} />
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs text-[#BDBDBD]">Visibility</span>
            <div className="grid grid-cols-2 border border-[#30363D] bg-[#161B22]">
              <button
                type="button"
                aria-pressed={!privateRepo}
                onClick={() => onChangePrivate(false)}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${!privateRepo ? 'bg-[#052E16] text-[#4ADE80]' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
              >
                <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />Public
              </button>
              <button
                type="button"
                aria-pressed={privateRepo}
                onClick={() => onChangePrivate(true)}
                className={`flex items-center justify-center gap-1.5 border-l border-[#30363D] py-2 text-xs font-medium transition-colors ${privateRepo ? 'bg-[#052E16] text-[#4ADE80]' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
              >
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />Private
              </button>
            </div>
          </div>

          <div className="space-y-3 border-t border-[#21262D] pt-3">
            <div className="flex items-center justify-between gap-2 text-xs text-[#E6EDF3]">
              <span>Add a README file</span>
              <button
                type="button"
                role="switch"
                aria-label="Add a README file"
                aria-checked={autoInit}
                onClick={() => onChangeAutoInit(!autoInit)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center border transition-colors ${
                  autoInit ? 'border-[#22C55E] bg-[#052E16]' : 'border-[#30363D] bg-[#161B22]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transition-transform ${
                    autoInit ? 'translate-x-[18px] bg-[#22C55E]' : 'translate-x-[2px] bg-[#6E7681]'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="git-gitignore-select" className="mb-1 block text-[11px] text-[#8B949E]">Add .gitignore</label>
                <select id="git-gitignore-select" value={gitignoreTemplate} onChange={(e) => onChangeGitignore(e.target.value)} className={`${INPUT_CLASS} font-mono`}>
                  {GITIGNORE_OPTIONS.map((opt) => (
                    <option key={opt || 'none'} value={opt} className="bg-[#161B22]">{opt || 'None'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="git-license-select" className="mb-1 block text-[11px] text-[#8B949E]">Choose a license</label>
                <select id="git-license-select" value={licenseTemplate} onChange={(e) => onChangeLicense(e.target.value)} className={`${INPUT_CLASS} font-mono`}>
                  {LICENSE_OPTIONS.map((opt) => (
                    <option key={opt.value || 'none'} value={opt.value} className="bg-[#161B22]">{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-[#21262D] pt-3">
        <span className="truncate font-mono text-[11px] text-[#8B949E]">
          {mode === 'connect' && selectedFull ? `${selectedFull} · ${defaultBranch || 'main'}` : mode === 'create' ? `${privateRepo ? 'Private' : 'Public'} repository` : 'Select a repository above'}
        </span>
        <Button type="submit" variant="primary" disabled={submitting || !canSubmit}>
          {submitting ? 'Connecting...' : mode === 'connect' ? 'Connect Repository' : 'Create & Connect Repository'}
        </Button>
      </div>
    </form>
  );
}
