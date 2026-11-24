import { describe, expect, it } from 'vitest';
import type { GitCommitDto } from '../../types/git.types';
import { computeGitGraphLayout } from './gitGraphLayout';

function commit(sha: string, parentShas: string[], message = 'msg'): GitCommitDto {
  return {
    sha,
    message,
    authorName: 'nhatprx',
    authorEmail: 'n@orbit.dev',
    committedAt: '2026-11-24T00:00:00Z',
    filesChanged: 1,
    additions: 1,
    deletions: 0,
    htmlUrl: null,
    parentShas,
  };
}

describe('computeGitGraphLayout', () => {
  it('allocates parallel lanes for merge commits and converges back to common ancestor', () => {
    const commits: GitCommitDto[] = [
      commit('m2', ['m1', 'f2'], 'Merge feat-2'),
      commit('f2', ['base'], 'feat-2 work'),
      commit('m1', ['base', 'f1'], 'Merge feat-1'),
      commit('f1', ['base'], 'feat-1 work'),
      commit('base', [], 'initial'),
    ];

    const layout = computeGitGraphLayout(commits);
    expect(layout.maxLanes).toBeGreaterThanOrEqual(2);
    expect(layout.rows[0]?.isMerge).toBe(true);
    expect(layout.rows[0]?.outgoingCurves).toHaveLength(1);
    expect(layout.rows[1]?.lane).toBe(1);
    const totalCurves = layout.rows.reduce((sum, r) => sum + r.outgoingCurves.length + r.incomingCurves.length, 0);
    expect(totalCurves).toBeGreaterThanOrEqual(3);
  });

  it('handles linear history cleanly in a single lane', () => {
    const commits = [commit('c3', ['c2']), commit('c2', ['c1']), commit('c1', [])];
    const layout = computeGitGraphLayout(commits);
    expect(layout.maxLanes).toBe(1);
    expect(layout.rows.every((r) => r.lane === 0)).toBe(true);
  });
});
