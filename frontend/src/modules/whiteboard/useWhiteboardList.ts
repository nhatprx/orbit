import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../../services/workspace/httpClient';
import { whiteboardService, type WhiteboardService } from '../../services/whiteboard/whiteboard.service';
import type {
  CreateWhiteboardRequest,
  UpdateWhiteboardRequest,
  WhiteboardDetail,
  WhiteboardScope,
  WhiteboardSummary,
} from '../../types/whiteboard.types';
import { WHITEBOARD_PAGE_SIZE, whiteboardScopeKey } from './whiteboardPermissions';

export interface WhiteboardListState {
  boards: WhiteboardSummary[];
  page: number;
  totalPages: number;
  totalElements: number;
  searchInput: string;
  loading: boolean;
  mutating: boolean;
  error: string | null;
  setSearchInput: (value: string) => void;
  setPage: (page: number) => void;
  clearError: () => void;
  refresh: () => Promise<void>;
  createBoard: (request: CreateWhiteboardRequest) => Promise<WhiteboardDetail>;
  renameBoard: (boardId: string, request: UpdateWhiteboardRequest) => Promise<WhiteboardSummary>;
  deleteBoard: (boardId: string) => Promise<void>;
}

export function useWhiteboardList(
  scope: WhiteboardScope,
  canRead: boolean,
  service: WhiteboardService = whiteboardService
): WhiteboardListState {
  const scopeKey = whiteboardScopeKey(scope);
  const [boards, setBoards] = useState<WhiteboardSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchInput, setSearchInputState] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
    setSearchInputState('');
    setDebouncedQuery('');
    setBoards([]);
    setError(null);
  }, [scopeKey]);

  const setSearchInput = useCallback((value: string) => {
    setSearchInputState(value);
    setPage(0);
  }, []);

  const load = useCallback(async () => {
    if (!canRead) {
      setBoards([]);
      setTotalElements(0);
      setTotalPages(0);
      return;
    }
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await service.listBoards(scopeRef.current, {
        q: debouncedQuery || undefined,
        page,
        size: WHITEBOARD_PAGE_SIZE,
      });
      if (seq !== requestSeqRef.current) return;
      setBoards(response.items);
      setTotalElements(response.totalElements);
      setTotalPages(response.totalPages);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      setError(errorMessage(err, 'Failed to load whiteboards.'));
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [canRead, debouncedQuery, page, scopeKey, service]);

  useEffect(() => {
    void load();
  }, [load]);

  const createBoard = useCallback(
    async (request: CreateWhiteboardRequest): Promise<WhiteboardDetail> => {
      setMutating(true);
      setError(null);
      try {
        const created = await service.createBoard(scopeRef.current, request);
        await load();
        return created;
      } catch (err) {
        setError(errorMessage(err, 'Failed to create whiteboard.'));
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [load, service]
  );

  const renameBoard = useCallback(
    async (boardId: string, request: UpdateWhiteboardRequest): Promise<WhiteboardSummary> => {
      setMutating(true);
      setError(null);
      try {
        const updated = await service.updateBoard(scopeRef.current, boardId, request);
        setBoards((prev) => prev.map((item) => (item.id === boardId ? updated : item)));
        return updated;
      } catch (err) {
        setError(errorMessage(err, 'Failed to update whiteboard.'));
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [service]
  );

  const deleteBoard = useCallback(
    async (boardId: string): Promise<void> => {
      setMutating(true);
      setError(null);
      try {
        await service.deleteBoard(scopeRef.current, boardId);
        await load();
      } catch (err) {
        setError(errorMessage(err, 'Failed to delete whiteboard.'));
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [load, service]
  );

  return {
    boards,
    page,
    totalPages,
    totalElements,
    searchInput,
    loading,
    mutating,
    error,
    setSearchInput,
    setPage,
    clearError: () => setError(null),
    refresh: load,
    createBoard,
    renameBoard,
    deleteBoard,
  };
}
