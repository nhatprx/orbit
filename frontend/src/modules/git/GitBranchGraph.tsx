import { useMemo, useState } from 'react';
import { Code2, GitBranch, Share2, User } from 'lucide-react';
import type { GitBranchDto, GitCommitDto } from '../../types/git.types';
import { initialsOf } from '../../utils/format';
import { formatGitTimestamp } from './gitFormat';
import { computeGitGraphLayout } from './gitGraphLayout';
import type { ShareToChatPayload } from './GitShareToChatModal';

interface GitBranchGraphProps {
  branches: GitBranchDto[];
  commits: GitCommitDto[];
  activeBranch: string;
  avatarByAuthor?: Record<string, string>;
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

const LANE_W = 12, PAD_X = 8, ROW_H = 26, MID_Y = 13;
const laneX = (lane: number) => PAD_X + lane * LANE_W;
const parseMergeBranch = (msg: string) => msg.match(/merge (?:branch|pull request #\d+ from)\s+['"]?([^'"\s]+)['"]?/i)?.[1] ?? null;
const shortCommitLabel = (firstLine: string, max = 26) => {
  const clean = firstLine.trim();
  return clean.length > max ? `${clean.slice(0, max - 3).trimEnd()}...` : clean;
};

export function GitBranchGraph({
  branches, commits, activeBranch, avatarByAuthor = {},
  onManageBranches, onInspectCommit, onShareToChat, onBrowseCode, onViewAllCommits,
}: GitBranchGraphProps) {
  const [hovered, setHovered] = useState<{ commit: GitCommitDto; branchLabel: string } | null>(null);
  const sortedBranches = useMemo(() => [...branches].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)), [branches]);
  const branchBySha = useMemo(() => {
    const map = new Map<string, GitBranchDto[]>();
    for (const b of sortedBranches) { const list = map.get(b.sha) ?? []; list.push(b); map.set(b.sha, list); }
    return map;
  }, [sortedBranches]);

  const layout = useMemo(() => computeGitGraphLayout(commits), [commits]);
  const svgW = PAD_X * 2 + Math.max(1, layout.maxLanes) * LANE_W;
  const resolveBranch = (commit: GitCommitDto) => {
    const refs = branchBySha.get(commit.sha) ?? [];
    return refs.length > 0 ? refs.map((r) => r.name).join(', ') : (parseMergeBranch(commit.message) ?? activeBranch);
  };
  const detail = hovered ?? (commits[0] ? { commit: commits[0], branchLabel: resolveBranch(commits[0]) } : null);

  return (
    <section className="flex h-[calc(100vh-11.5rem)] min-w-0 flex-col overflow-hidden border border-[#30363D] bg-[#161B22]">
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

      {commits.length === 0 ? (
        <p className="px-3 py-5 text-xs text-[#8A8A8A]">No commits synced yet on {activeBranch}.</p>
      ) : (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden" onMouseLeave={() => setHovered(null)}>
          {commits.map((commit, idx) => {
            const row = layout.rows[idx]!;
            const isHead = idx === 0;
            const refs = branchBySha.get(commit.sha) ?? [];
            const branchLabel = resolveBranch(commit);
            const firstLine = commit.message.split('\n')[0] ?? commit.message;
            const cx = laneX(row.lane);
            return (
              <div key={commit.sha} onMouseEnter={() => setHovered({ commit, branchLabel })} className={`group flex h-7 items-center gap-1.5 pr-2 text-xs transition-colors hover:bg-[#0D1117] ${isHead ? 'bg-[#052E16]/35' : ''}`}>
                <button type="button" onClick={() => onInspectCommit(commit.sha)} title={`${firstLine}\nBranch: ${branchLabel} · Author: ${commit.authorName} · ${commit.sha.slice(0, 7)}`} className="flex h-full min-w-0 flex-1 items-center gap-1.5 text-left">
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
                    {shortCommitLabel(firstLine, 26)}
                  </span>

                  {refs.length > 0 && (
                    <span className="shrink-0 border border-[#22C55E] bg-[#052E16] px-1 py-0.5 font-mono text-[9px] text-[#4ADE80]">
                      {refs[0]?.name}
                    </span>
                  )}

                  {avatarByAuthor[commit.authorName.toLowerCase()] ? (
                    <img src={avatarByAuthor[commit.authorName.toLowerCase()]} alt={commit.authorName} title={commit.authorName} className="h-4 w-4 shrink-0 border border-[#30363D] object-cover" />
                  ) : (
                    <span title={commit.authorName} className="flex h-4 w-4 shrink-0 items-center justify-center border border-[#30363D] bg-[#0D1117] font-mono text-[8px] font-semibold text-[#4ADE80]">
                      {initialsOf(commit.authorName)}
                    </span>
                  )}
                  <span className="shrink-0 border border-[#21262D] bg-[#0D1117] px-1 py-0.5 font-mono text-[10px] text-[#4ADE80]">
                    {commit.sha.slice(0, 7)}
                  </span>
                </button>

                {onShareToChat && (
                  <button type="button" aria-label={`Share commit ${commit.sha.slice(0, 7)} to chat`} onClick={() => onShareToChat({ title: `Commit ${commit.sha.slice(0, 7)}`, body: `[Git Commit ${commit.sha.slice(0, 7)}] ${firstLine}\nBranch: ${branchLabel} · Author: ${commit.authorName}${commit.htmlUrl ? `\n${commit.htmlUrl}` : ''}` })} className="shrink-0 p-0.5 text-[#7D8590] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#4ADE80]">
                    <Share2 className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex h-[52px] shrink-0 flex-col justify-between overflow-hidden border-t border-[#22C55E]/60 bg-[#0D1117] px-3 py-1.5 text-xs">
        {detail ? (
          <>
            <p className="truncate font-medium leading-4 text-[#E6EDF3]" title={detail.commit.message}>
              {detail.commit.message.split('\n')[0]}
            </p>
            <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap font-mono text-[10px] text-[#8B949E]">
              <span className="inline-flex shrink-0 items-center gap-1 text-[#4ADE80]"><GitBranch className="h-3 w-3" strokeWidth={1.5} />{detail.branchLabel}</span>
              <span className="inline-flex min-w-0 items-center gap-1 truncate text-[#E6EDF3]"><User className="h-3 w-3 shrink-0 text-[#8B949E]" strokeWidth={1.5} />{detail.commit.authorName}</span>
              <span className="shrink-0">{detail.commit.sha.slice(0, 7)}</span>
              <span className="shrink-0">{formatGitTimestamp(detail.commit.committedAt, '')}</span>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-[#6E7681]">No commit details available.</p>
        )}
      </div>
    </section>
  );
}
