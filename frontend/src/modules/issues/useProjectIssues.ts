import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { issuesService, type IssuesService } from '../../services/issues/issues.service';
import { errorMessage } from '../../services/workspace/httpClient';
import type {
  CreateIssueRequest,
  CreateSprintRequest,
  IssueDto,
  IssueStatus,
  SprintDto,
  UpdateIssueRequest,
  UpdateSprintRequest,
} from '../../types/issues.types';
import {
  INITIAL_ISSUE_FILTERS,
  matchesProjectIssueFilters,
  type ProjectIssueFilters,
} from './issueFilters';

export type { ProjectIssueFilters };
export { INITIAL_ISSUE_FILTERS };

export function useProjectIssues(
  workspaceId: string,
  projectId: string,
  service: IssuesService = issuesService
) {
  const [issues, setIssues] = useState<IssueDto[]>([]);
  const [sprints, setSprints] = useState<SprintDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProjectIssueFilters>(INITIAL_ISSUE_FILTERS);
  const requestSeq = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const [nextIssues, nextSprints] = await Promise.all([
        service.listIssues(workspaceId, projectId),
        service.listSprints(workspaceId, projectId),
      ]);
      if (seq !== requestSeq.current) return;
      setIssues(nextIssues);
      setSprints(nextSprints);
    } catch (err: unknown) {
      if (seq === requestSeq.current) {
        setError(errorMessage(err, 'Could not load project issues.'));
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [workspaceId, projectId, service]);

  useEffect(() => {
    setFilters(INITIAL_ISSUE_FILTERS);
    void refresh();
  }, [refresh]);

  const setFilter = useCallback(
    <K extends keyof ProjectIssueFilters>(key: K, value: ProjectIssueFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => setFilters(INITIAL_ISSUE_FILTERS), []);
  const clearError = useCallback(() => setError(null), []);

  const runAction = useCallback(
    async <T,>(action: () => Promise<T>, fallbackMsg: string, rethrow = false): Promise<T | undefined> => {
      setMutating(true);
      setError(null);
      try {
        const result = await action();
        await refresh();
        return result;
      } catch (err: unknown) {
        setError(errorMessage(err, fallbackMsg));
        if (rethrow) throw err;
        return undefined;
      } finally {
        setMutating(false);
      }
    },
    [refresh]
  );

  const createIssue = useCallback(
    async (req: CreateIssueRequest) =>
      (await runAction(() => service.createIssue(workspaceId, projectId, req), 'Could not create issue.', true)) as IssueDto,
    [runAction, service, workspaceId, projectId]
  );

  const updateIssue = useCallback(
    async (issueId: string, req: UpdateIssueRequest) =>
      (await runAction(() => service.updateIssue(workspaceId, projectId, issueId, req), 'Could not update issue.', true)) as IssueDto,
    [runAction, service, workspaceId, projectId]
  );

  const moveIssueStatus = useCallback(
    async (issueId: string, status: IssueStatus) => {
      await runAction(() => service.updateIssue(workspaceId, projectId, issueId, { status }), 'Could not move issue status.');
    },
    [runAction, service, workspaceId, projectId]
  );

  const assignIssueSprint = useCallback(
    async (issueId: string, sprintId: string | null) => {
      const patch: UpdateIssueRequest = sprintId === null ? { sprintId: null, clearSprint: true } : { sprintId };
      await runAction(() => service.updateIssue(workspaceId, projectId, issueId, patch), 'Could not update issue sprint.');
    },
    [runAction, service, workspaceId, projectId]
  );

  const createSprint = useCallback(
    async (req: CreateSprintRequest) =>
      (await runAction(() => service.createSprint(workspaceId, projectId, req), 'Could not create sprint.', true)) as SprintDto,
    [runAction, service, workspaceId, projectId]
  );

  const updateSprint = useCallback(
    async (sprintId: string, req: UpdateSprintRequest) =>
      (await runAction(() => service.updateSprint(workspaceId, projectId, sprintId, req), 'Could not update sprint.', true)) as SprintDto,
    [runAction, service, workspaceId, projectId]
  );

  const startSprint = useCallback(
    async (sprintId: string) => {
      await runAction(() => service.updateSprint(workspaceId, projectId, sprintId, { status: 'ACTIVE' }), 'Could not start sprint.');
    },
    [runAction, service, workspaceId, projectId]
  );

  const completeSprint = useCallback(
    async (sprintId: string, moveIncompleteToBacklog = true) => {
      await runAction(
        () => service.updateSprint(workspaceId, projectId, sprintId, { status: 'COMPLETED', moveIncompleteToBacklog }),
        'Could not complete sprint.',
        true
      );
    },
    [runAction, service, workspaceId, projectId]
  );

  const deleteSprint = useCallback(
    async (sprintId: string) => {
      await runAction(() => service.deleteSprint(workspaceId, projectId, sprintId), 'Could not delete sprint.', true);
    },
    [runAction, service, workspaceId, projectId]
  );

  const filteredIssues = useMemo(
    () => issues.filter((issue) => matchesProjectIssueFilters(issue, filters)),
    [issues, filters]
  );
  const epics = useMemo(() => issues.filter((issue) => issue.type === 'EPIC'), [issues]);
  const activeSprint = useMemo(() => sprints.find((s) => s.status === 'ACTIVE') ?? null, [sprints]);

  return {
    issues, sprints, loading, mutating, error, clearError,
    filters, setFilter, setFilters, resetFilters,
    filteredIssues, epics, activeSprint,
    refresh, createIssue, updateIssue, moveIssueStatus, assignIssueSprint,
    createSprint, updateSprint, startSprint, completeSprint, deleteSprint,
  };
}
