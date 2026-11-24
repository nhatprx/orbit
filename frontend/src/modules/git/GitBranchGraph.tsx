import { useMemo, useState } from 'react';
import { Code2, GitBranch, GitCompare, GitPullRequest, Lock, Share2, User } from 'lucide-react';
import type { GitBranchDto, GitCommitDto } from '../../types/git.types';
import { formatGitTimestamp } from './gitFormat';
import { computeGitGraphLayout } from './gitGraphLayout';
import type { ShareToChatPayload } from './GitShareToChatModal';

interface GitBranchGraphProps {
  branches: GitBranchDto[];
  commits: GitCommitDto[];
  activeBranch: string;
  canWrite?: boolean;
  onSelectBranch: (name: string) => void;
  onManageBranches: () => void;
  onCompareBranch?: (baseBranch: string, headBranch: string) => void;
  onQuickPr?: (headBranch: string) => void;
  onInspectCommit: (sha: string) => void;
  onShareToChat?: (payload: ShareToChatPayload) => void;
  onBrowseCode?: () => void;
  onViewAllCommits?: () => void;
}

const LANE_W = 14;
const PAD_X = 10;
const ROW_H = 28;
const MID_Y = ROW_H / 2;
const laneX = (lane: number) => PAD_X + lane * LANE_W;
const parseMergeBranch = (msg: string) => msg.match(/merge (?:branch|pull request #\d+ from)\s+['"]?([^'"\s]+)['"]?/i)?.[1] ?? null;
const shortCommitLabel = (firstLine: string, max = 34) => {
  const clean = firstLine.trim();
  return clean.length > max ? `${clean.slice(0, max - 3).trimEnd()}...` : clean;
};

export function GitBranchGraph({
  branches, commits, activeBranch, canWrite = false,
  onSelectBranch, onManageBranches, onCompareBranch, onQuickPr,
  onInspectCommit, onShareToChat, onBrowseCode, onViewAllCommits,
}: GitBranchGraphProps) {
  const [hovered, setHovered] = useState<{ commit: GitCommitDto; branchLabel: string } | null>(null);
  const sortedBranches = useMemo(
    () => [...branches].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    [branches]
  );
  const defaultBranch = sortedBranches.find((b) => b.isDefault)?.name ?? sortedBranches[0]?.name ?? 'main';
  const branchBySha = useMemo(() => {
    const map = new Map<string, GitBranchDto[]>();
    for (const b of sortedBranches) {
      const list = map.get(b.sha) ?? [];
      list.push(b);
      map.set(b.sha, list);
    }
    return map;
  }, [sortedBranches]);

  const layout = useMemo(() => computeGitGraphLayout(commits), [commits]);
  const svgW = PAD_X * 2 + Math.max(1, layout.maxLanes) * LANE_W;

  return (
    <section className="flex flex-col border border-[#30363D] bg-[#161B22]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E6EDF3]">
          <GitBranch className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <span>Graph</span>
          <span className="font-mono text-[10px] font-normal text-[#8A8A8A]">({commits.length})</span>
        </div>
        <div className="flex items-center gap-2.5 font-mono text-[10px]">
          {onBrowseCode && (
            <button type="button" onClick={onBrowseCode} className="inline-flex items-center gap-1 text-[#BDBDBD] hover:text-[#4ADE80]">
              <Code2 className="h-3 w-3" strokeWidth={1.5} />Browse files
            </button>
          )}
          {onViewAllCommits && (
            <button type="button" onClick={onViewAllCommits} className="text-[#BDBDBD] hover:text-[#4ADE80]">All commits</button>
          )}
          <button type="button" onClick={onManageBranches} className="text-[#22C55E] hover:underline">
            Manage ({branches.length})
          </button>
        </div>
      </div>

      {sortedBranches.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 border-b border-[#21262D] bg-[#0D1117] px-2.5 py-1.5">
          {sortedBranches.slice(0, 10).map((b) => {
            const active = b.name === activeBranch;
            return (
              <div key={b.name} className={`inline-flex items-center border font-mono text-[10px] ${active ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : 'border-[#30363D] bg-[#161B22] text-[#BDBDBD]'}`}>
                <button type="button" onClick={() => onSelectBranch(b.name)} className="inline-flex items-center gap-1 px-1.5 py-0.5 hover:text-[#E6EDF3]">
                  <span>{b.name}</span>
                  {b.isProtected && <Lock className="h-2.5 w-2.5 text-[#EAB308]" strokeWidth={1.5} />}
                </button>
                {!b.isDefault && onCompareBranch && (
                  <button type="button" title={`Compare ${defaultBranch}...${b.name}`} onClick={() => onCompareBranch(defaultBranch, b.name)} className="border-l border-[#30363D] px-1 py-0.5 text-[#8B949E] hover:text-[#4ADE80]">
                    <GitCompare className="h-2.5 w-2.5" strokeWidth={1.5} />
                  </button>
                )}
                {!b.isDefault && canWrite && onQuickPr && (
                  <button type="button" title={`Create PR from ${b.name}`} onClick={() => onQuickPr(b.name)} className="border-l border-[#30363D] px-1 py-0.5 text-[#4ADE80] hover:bg-[#22C55E] hover:text-[#0D1117]">
                    <GitPullRequest className="h-2.5 w-2.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {commits.length === 0 ? (
        <p className="px-3 py-5 text-xs text-[#8A8A8A]">No commits synced yet on {activeBranch}.</p>
      ) : (
        <div className="max-h-[calc(100vh-16.5rem)] overflow-y-auto" onMouseLeave={() => setHovered(null)}>
          {commits.map((commit, idx) => {
            const row = layout.rows[idx]!;
            const isHead = idx === 0;
            const refs = branchBySha.get(commit.sha) ?? [];
            const branchLabel = refs.length > 0 ? refs.map((r) => r.name).join(', ') : (parseMergeBranch(commit.message) ?? activeBranch);
            const firstLine = commit.message.split('\n')[0] ?? commit.message;
            const cx = laneX(row.lane);

            return (
              <div
                key={commit.sha}
                onMouseEnter={() => setHovered({ commit, branchLabel })}
                className={`group flex h-7 items-center gap-1.5 pr-2 text-xs transition-colors hover:bg-[#0D1117] ${isHead ? 'bg-[#052E16]/35' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onInspectCommit(commit.sha)}
                  title={`${firstLine}\nBranch: ${branchLabel} · Author: ${commit.authorName} · ${commit.sha.slice(0, 7)}`}
                  className="flex h-full min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <svg width={svgW} height={ROW_H} viewBox={`0 0 ${svgW} ${ROW_H}`} className="shrink-0" aria-hidden="true">
                    {row.passThroughs.map((pt) => (
                      <line key={`pt-${pt.lane}`} x1={laneX(pt.lane)} y1={0} x2={laneX(pt.lane)} y2={ROW_H} stroke={pt.color} strokeWidth="1.5" />
                    ))}
                    {row.hasTop && <line x1={cx} y1={0} x2={cx} y2={MID_Y} stroke={row.color} strokeWidth="1.5" />}
                    {row.hasBottom && <line x1={cx} y1={MID_Y} x2={cx} y2={ROW_H} stroke={row.color} strokeWidth="1.5" />}
                    {row.incomingCurves.map((c, i) => (
                      <path key={`in-${i}`} d={`M ${laneX(c.fromLane)} 0 C ${laneX(c.fromLane)} ${MID_Y}, ${laneX(c.toLane)} ${MID_Y * 0.5}, ${laneX(c.toLane)} ${MID_Y}`} fill="none" stroke={c.color} strokeWidth="1.5" />
                    ))}
                    {row.outgoingCurves.map((c, i) => (
                      <path key={`out-${i}`} d={`M ${laneX(c.fromLane)} ${MID_Y} C ${laneX(c.toLane)} ${MID_Y}, ${laneX(c.toLane)} ${MID_Y + 4}, ${laneX(c.toLane)} ${ROW_H}`} fill="none" stroke={c.color} strokeWidth="1.5" />
                    ))}
                    {isHead || row.isMerge ? (
                      <>
                        <rect x={cx - 4} y={MID_Y - 4} width="8" height="8" fill="#0D1117" stroke={row.color} strokeWidth="1.5" />
                        <rect x={cx - 1.5} y={MID_Y - 1.5} width="3" height="3" fill={row.color} />
                      </>
                    ) : (
                      <rect x={cx - 3} y={MID_Y - 3} width="6" height="6" fill={row.color} />
                    )}
                  </svg>

                  <span className={`min-w-0 flex-1 truncate ${isHead ? 'font-semibold text-[#E6EDF3]' : 'text-[#D0D7DE]'}`}>
                    {shortCommitLabel(firstLine)}
                  </span>

                  {refs.length > 0 && (
                    <span className="shrink-0 border border-[#22C55E] bg-[#052E16] px-1 py-0.5 font-mono text-[9px] text-[#4ADE80]">
                      {refs[0]?.name}
                    </span>
                  )}

                  <span className="shrink-0 font-mono text-[10px] text-[#7D8590]">{commit.authorName}</span>
                </button>

                {onShareToChat && (
                  <button
                    type="button"
                    aria-label={`Share commit ${commit.sha.slice(0, 7)} to chat`}
                    onClick={() => onShareToChat({ title: `Commit ${commit.sha.slice(0, 7)}`, body: `[Git Commit ${commit.sha.slice(0, 7)}] ${firstLine}\nBranch: ${branchLabel} · Author: ${commit.authorName}${commit.htmlUrl ? `\n${commit.htmlUrl}` : ''}` })}
                    className="shrink-0 p-0.5 text-[#7D8590] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#4ADE80]"
                  >
                    <Share2 className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hovered && (
        <div className="border-t border-[#22C55E]/60 bg-[#0D1117] px-3 py-2 text-xs">
          <p className="break-words font-medium text-[#E6EDF3]">{hovered.commit.message}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-[#8B949E]">
            <span className="inline-flex items-center gap-1 text-[#4ADE80]"><GitBranch className="h-3 w-3" strokeWidth={1.5} />{hovered.branchLabel}</span>
            <span className="inline-flex items-center gap-1 text-[#E6EDF3]"><User className="h-3 w-3 text-[#8B949E]" strokeWidth={1.5} />{hovered.commit.authorName}</span>
            <span>{hovered.commit.sha.slice(0, 7)}</span>
            <span>{formatGitTimestamp(hovered.commit.committedAt, '')}</span>
          </div>
        </div>
      )}
    </section>
  );
}
