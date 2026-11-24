import { useCallback, useEffect, useState } from 'react';
import { fetchGitCollaborators, fetchGitRepoStats, fetchGitWorkflowRuns } from '../../services/git/gitInsightsApi';
import type { GitCollaboratorDto, GitRepoStatsDto, GitWorkflowRunDto } from '../../types/git-insights.types';
import { gitScopeKey, type GitScope } from '../../types/git.types';
import { getCachedGitInsights, setCachedGitInsights } from './gitWorkspaceCache';

export function useGitInsights(scope: GitScope, repoId: string | null, enabled: boolean) {
  const scopeKey = gitScopeKey(scope);
  const cached = enabled ? getCachedGitInsights(scopeKey) : null;
  const [runs, setRuns] = useState<GitWorkflowRunDto[]>(cached?.runs ?? []);
  const [collaborators, setCollaborators] = useState<GitCollaboratorDto[]>(cached?.collaborators ?? []);
  const [stats, setStats] = useState<GitRepoStatsDto | null>(cached?.stats ?? null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled || !repoId) {
        setRuns([]);
        setCollaborators([]);
        setStats(null);
        return;
      }
      setLoading(true);
      try {
        const [nextRuns, nextCollabs, nextStats] = await Promise.all([
          fetchGitWorkflowRuns(scope, 15, signal).catch(() => []),
          fetchGitCollaborators(scope, signal).catch(() => []),
          fetchGitRepoStats(scope, signal).catch(() => null),
        ]);
        if (!signal?.aborted) {
          setRuns(nextRuns);
          setCollaborators(nextCollabs);
          setStats(nextStats);
          setCachedGitInsights(scopeKey, { runs: nextRuns, collaborators: nextCollabs, stats: nextStats });
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, repoId, scopeKey]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { runs, collaborators, stats, loading, refresh: () => void load() };
}
