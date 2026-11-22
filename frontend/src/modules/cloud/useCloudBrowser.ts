import { useCallback, useEffect, useRef, useState } from 'react';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import { errorMessage } from '../../services/workspace/httpClient';
import type {
  CloudBreadcrumbItem,
  CloudNodeDto,
  CloudQuotaDto,
  CloudSortBy,
  CloudSortDir,
  CloudView,
} from '../../types/cloud.types';

const PAGE_LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 250;

interface HistoryEntry {
  view: CloudView;
  parentId: string | null;
}

export function useCloudBrowser(
  api: CloudFilesApi,
  scopeKey: string,
  canRead: boolean,
  initialView: CloudView = 'ALL'
) {
  const [history, setHistory] = useState<HistoryEntry[]>([{ view: initialView, parentId: null }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const current = history[historyIndex] ?? { view: initialView, parentId: null };
  const view = current.view;
  const parentId = current.parentId;

  const [breadcrumbs, setBreadcrumbs] = useState<CloudBreadcrumbItem[]>([]);
  const [nodes, setNodes] = useState<CloudNodeDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<CloudQuotaDto | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<CloudSortBy>('name');
  const [sortDir, setSortDir] = useState<CloudSortDir>('asc');
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHistory([{ view: initialView, parentId: null }]);
    setHistoryIndex(0);
    setBreadcrumbs([]);
    setNodes([]);
    setNextCursor(null);
    setHasMore(false);
    setQuota(null);
    setSearchInput('');
    setDebouncedQuery('');
    setError(null);
  }, [scopeKey, initialView]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!canRead) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const activeParent = view === 'ALL' ? parentId : null;
    const crumbsPromise = activeParent
      ? api.getBreadcrumbs(activeParent, controller.signal).then((r) => r.items)
      : Promise.resolve<CloudBreadcrumbItem[]>([]);

    Promise.all([
      api.listNodes(
        { parentId: activeParent, view, q: debouncedQuery || undefined, sortBy, sortDir, limit: PAGE_LIMIT },
        controller.signal
      ),
      api.getQuota(controller.signal),
      crumbsPromise,
    ])
      .then(([page, quotaData, crumbs]) => {
        if (controller.signal.aborted) return;
        setNodes(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setQuota(quotaData);
        setBreadcrumbs(crumbs);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err, 'Failed to load cloud files.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [api, scopeKey, canRead, view, parentId, debouncedQuery, sortBy, sortDir, tick]);

  const pushEntry = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const cur = prev[historyIndex];
      if (cur && cur.view === entry.view && cur.parentId === entry.parentId) return prev;
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, entry];
    });
    setHistoryIndex((idx) => {
      const cur = history[idx];
      if (cur && cur.view === entry.view && cur.parentId === entry.parentId) return idx;
      return idx + 1;
    });
  }, [history, historyIndex]);

  const selectView = useCallback((next: CloudView) => {
    pushEntry({ view: next, parentId: null });
  }, [pushEntry]);

  const openFolder = useCallback((folderId: string | null) => {
    pushEntry({ view: 'ALL', parentId: folderId });
  }, [pushEntry]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;
  const goBack = useCallback(() => setHistoryIndex((i) => Math.max(0, i - 1)), []);
  const goForward = useCallback(() => setHistoryIndex((i) => Math.min(history.length - 1, i + 1)), [history.length]);

  const refresh = useCallback(async () => setTick((t) => t + 1), []);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await api.listNodes({
        parentId: view === 'ALL' ? parentId : null,
        view,
        q: debouncedQuery || undefined,
        sortBy,
        sortDir,
        cursor: nextCursor,
        limit: PAGE_LIMIT,
      });
      setNodes((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load more files.'));
    } finally {
      setLoadingMore(false);
    }
  }, [api, hasMore, nextCursor, loadingMore, view, parentId, debouncedQuery, sortBy, sortDir]);

  const toggleSortDir = useCallback(() => setSortDir((p) => (p === 'asc' ? 'desc' : 'asc')), []);
  const clearError = useCallback(() => setError(null), []);

  const runMutation = useCallback(async <T,>(fn: () => Promise<T>, reload = true): Promise<T | null> => {
    setError(null);
    try {
      const result = await fn();
      if (reload) setTick((t) => t + 1);
      return result;
    } catch (err) {
      setError(errorMessage(err, 'Action failed.'));
      return null;
    }
  }, []);

  return {
    view, parentId, breadcrumbs, nodes, hasMore, loading, loadingMore, error, quota,
    searchInput, debouncedQuery, sortBy, sortDir, tick,
    canGoBack, canGoForward, goBack, goForward,
    setSearchInput, setSortBy, toggleSortDir, selectView, openFolder,
    loadMore, refresh, clearError, runMutation,
  };
}
