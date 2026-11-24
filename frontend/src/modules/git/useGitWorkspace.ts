import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createHttpGitApi, type GitApi } from '../../services/git/gitApi';
import { errorMessage } from '../../services/workspace/httpClient';
import {
  gitScopeKey, type ConnectGitRepoRequest, type CreateGitBranchRequest,
  type CreateGitPullRequest, type CreateGitRepoRequest, type DeleteGitFileRequest,
  type GitBranchDto, type GitCommitDetailDto, type GitCommitDto, type GitFileContentDto,
  type GitPullRequestDto, type GitRepositoryDto, type GitScope, type GitTreeEntryDto,
  type MergeGitPullRequest, type UpsertGitFileRequest,
} from '../../types/git.types';

import { clearCachedGitWorkspace, getCachedGitWorkspace, setCachedGitWorkspace } from './gitWorkspaceCache';

export type GitPrFilter = 'all' | 'open' | 'closed';
const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

export function useGitWorkspace(scope: GitScope, apiOverride?: GitApi) {
  const scopeKey = gitScopeKey(scope);
  const useCache = !apiOverride;
  const cached = useCache ? getCachedGitWorkspace(scopeKey) : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const api = useMemo(() => apiOverride ?? createHttpGitApi(scope), [apiOverride, scopeKey]);
  const [repo, setRepo] = useState<GitRepositoryDto | null>(cached?.repo ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [branches, setBranches] = useState<GitBranchDto[]>(cached?.branches ?? []);
  const [activeBranch, setActiveBranchState] = useState(cached?.activeBranch ?? '');
  const [currentDir, setCurrentDir] = useState('');
  const [tree, setTree] = useState<GitTreeEntryDto[]>(cached?.tree ?? []);
  const [selectedFile, setSelectedFile] = useState<GitFileContentDto | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [commits, setCommits] = useState<GitCommitDto[]>(cached?.commits ?? []);
  const [syncingCommits, setSyncingCommits] = useState(false);
  const [pullRequests, setPullRequests] = useState<GitPullRequestDto[]>(cached?.pullRequests ?? []);
  const [prFilter, setPrFilterState] = useState<GitPrFilter>('all');
  const prFilterRef = useRef<GitPrFilter>('all');
  prFilterRef.current = prFilter;

  const resetConnected = useCallback(() => {
    setBranches([]); setActiveBranchState(''); setCurrentDir(''); setTree([]); setSelectedFile(null); setCommits([]); setPullRequests([]);
    if (useCache) clearCachedGitWorkspace(scopeKey);
  }, [scopeKey, useCache]);

  const loadBranchData = useCallback(async (branch: string, dir: string, signal?: AbortSignal) => {
    const [nextTree, nextCommits] = await Promise.all([api.listTree(branch, dir, signal), api.listCommits(branch, 100, signal)]);
    setTree(nextTree); setCommits(nextCommits);
    return { nextTree, nextCommits };
  }, [api]);

  const switchToBranchRoot = useCallback(async (branch: string, signal?: AbortSignal) => {
    setActiveBranchState(branch); setCurrentDir(''); setSelectedFile(null);
    return loadBranchData(branch, '', signal);
  }, [loadBranchData]);

  const hydrateConnected = useCallback(async (connected: GitRepositoryDto, signal?: AbortSignal) => {
    const branch = connected.defaultBranch || 'main';
    setActiveBranchState((prev) => prev || branch);
    const [branchList, branchData, nextPrs] = await Promise.all([
      api.listBranches(signal), loadBranchData(branch, '', signal), api.listPullRequests(prFilterRef.current, signal),
    ]);
    const resolvedBranch = connected.defaultBranch || branchList[0]?.name || 'main';
    setBranches(branchList); setActiveBranchState(resolvedBranch); setPullRequests(nextPrs);
    if (useCache) {
      setCachedGitWorkspace(scopeKey, {
        repo: connected, branches: branchList, activeBranch: resolvedBranch,
        tree: branchData.nextTree, commits: branchData.nextCommits, pullRequests: nextPrs,
      });
    }
  }, [api, loadBranchData, scopeKey, useCache]);

  const reloadAll = useCallback(async (signal?: AbortSignal) => {
    if (!useCache || !getCachedGitWorkspace(scopeKey)) setLoading(true);
    setError(null);
    try {
      const found = await api.getRepository(signal);
      setRepo(found);
      if (!found) { resetConnected(); return; }
      if (!signal?.aborted) setLoading(false);
      await hydrateConnected(found, signal);
    } catch (err) {
      if (!isAbort(err)) setError(errorMessage(err, 'Failed to load Git repository.'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [api, hydrateConnected, resetConnected, scopeKey, useCache]);

  useEffect(() => {
    const controller = new AbortController();
    void reloadAll(controller.signal);
    return () => controller.abort();
  }, [reloadAll]);

  const runAction = useCallback(async <T,>(task: () => Promise<T>, fallback: string, okMsg?: string): Promise<T> => {
    setError(null); setNotice(null);
    try {
      const result = await task();
      if (okMsg) setNotice(okMsg);
      return result;
    } catch (err) {
      setError(errorMessage(err, fallback));
      throw err;
    }
  }, []);

  const setActiveBranch = (branch: string) => {
    if (!repo) { setActiveBranchState(branch); return; }
    setError(null);
    void switchToBranchRoot(branch).catch((err) => setError(errorMessage(err, 'Failed to switch branch.')));
  };
  const setPrFilter = (next: GitPrFilter) => {
    setPrFilterState(next);
    if (!repo) return;
    setError(null);
    void api.listPullRequests(next).then(setPullRequests).catch((err) => setError(errorMessage(err, 'Failed to load pull requests.')));
  };
  const navigateDir = async (dirPath: string) => {
    if (!activeBranch) return;
    await runAction(async () => {
      setTree(await api.listTree(activeBranch, dirPath)); setCurrentDir(dirPath); setSelectedFile(null);
    }, 'Failed to load directory.');
  };
  const openFile = async (filePath: string) => {
    if (!activeBranch) return;
    setFileLoading(true);
    try { setSelectedFile(await runAction(() => api.getFile(activeBranch, filePath), 'Failed to load file.')); }
    finally { setFileLoading(false); }
  };
  const connectRepo = (req: ConnectGitRepoRequest) => runAction(async () => {
    const connected = await api.connectRepository(req); setRepo(connected); await hydrateConnected(connected); return connected;
  }, 'Failed to connect GitHub repository.', 'GitHub repository connected.');
  const createRepo = (req: CreateGitRepoRequest) => runAction(async () => {
    const created = await api.createRepository(req); setRepo(created); await hydrateConnected(created); return created;
  }, 'Failed to create GitHub repository.', 'GitHub repository created and connected.');
  const updateToken = (token: string) => runAction(async () => {
    const updated = await api.updateToken(token); setRepo(updated); return updated;
  }, 'Failed to update GitHub token.', 'GitHub token updated.');
  const disconnectRepo = () => runAction(async () => {
    await api.disconnectRepository(); setRepo(null); resetConnected();
  }, 'Failed to disconnect repository.', 'Repository disconnected.');
  const createBranch = (req: CreateGitBranchRequest) => runAction(async () => {
    const created = await api.createBranch(req); setBranches(await api.listBranches());
    await switchToBranchRoot(created.name); return created;
  }, 'Failed to create branch.', `Branch ${req.branchName} created.`);
  const deleteBranch = (name: string) => runAction(async () => {
    await api.deleteBranch(name);
    const branchList = await api.listBranches(); setBranches(branchList);
    if (activeBranch === name) await switchToBranchRoot(repo?.defaultBranch || branchList[0]?.name || 'main');
  }, 'Failed to delete branch.', `Branch ${name} deleted.`);
  const saveFile = (req: UpsertGitFileRequest) => runAction(async () => {
    const result = await api.upsertFile(req);
    if (result.file) setSelectedFile(result.file);
    await loadBranchData(req.branch, currentDir); return result;
  }, 'Failed to commit file to GitHub.', `Committed ${req.path} to ${req.branch}.`);
  const removeFile = (req: DeleteGitFileRequest) => runAction(async () => {
    const result = await api.deleteFile(req);
    if (selectedFile?.path === req.path) setSelectedFile(null);
    await loadBranchData(req.branch, currentDir); return result;
  }, 'Failed to delete file from GitHub.', `Deleted ${req.path} from ${req.branch}.`);
  const pullCommitHistory = async () => {
    if (!activeBranch) return [];
    setSyncingCommits(true);
    try {
      return await runAction(async () => {
        const synced = await api.syncCommits(activeBranch, 100); setCommits(synced);
        const refreshed = await api.getRepository(); if (refreshed) setRepo(refreshed);
        return synced;
      }, 'Failed to pull commit history from GitHub.', 'Commit history synced from GitHub.');
    } finally { setSyncingCommits(false); }
  };
  const inspectCommit = (sha: string): Promise<GitCommitDetailDto> =>
    runAction(() => api.getCommitDetail(sha), 'Failed to load commit diff.');
  const createPr = (req: CreateGitPullRequest) => runAction(async () => {
    const created = await api.createPullRequest(req);
    setPullRequests(await api.listPullRequests(prFilterRef.current));
    setNotice(`Pull request #${created.number} created.`); return created;
  }, 'Failed to create pull request.');
  const mergePr = (pullNumber: number, body?: MergeGitPullRequest) => runAction(async () => {
    const merged = await api.mergePullRequest(pullNumber, body);
    const [nextPrs, nextCommits] = await Promise.all([
      api.listPullRequests(prFilterRef.current),
      activeBranch ? api.listCommits(activeBranch, 100) : Promise.resolve(commits),
    ]);
    setPullRequests(nextPrs); setCommits(nextCommits); return merged;
  }, 'Failed to merge pull request.', `Pull request #${pullNumber} merged.`);

  return {
    api, repo, loading, error, notice, branches, activeBranch, currentDir, tree,
    selectedFile, fileLoading, commits, syncingCommits, pullRequests, prFilter,
    setActiveBranch, setPrFilter, clearError: () => setError(null), clearNotice: () => setNotice(null),
    reloadAll, navigateDir, openFile, connectRepo, createRepo, updateToken, disconnectRepo,
    createBranch, deleteBranch, saveFile, removeFile, pullCommitHistory, inspectCommit, createPr, mergePr,
  };
}
