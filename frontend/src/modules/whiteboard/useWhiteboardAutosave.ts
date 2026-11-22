import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../../services/workspace/httpClient';
import { whiteboardService, type WhiteboardService } from '../../services/whiteboard/whiteboard.service';
import type {
  WhiteboardAsset,
  WhiteboardDetail,
  WhiteboardSaveState,
  WhiteboardScope,
} from '../../types/whiteboard.types';
import { WHITEBOARD_AUTOSAVE_DEBOUNCE_MS, whiteboardScopeKey } from './whiteboardPermissions';
import {
  buildFileSignature,
  classifySaveError,
  loadBoardWithAssets,
  persistSceneWithAssets,
  type WhiteboardSceneSnapshot,
} from './whiteboardSceneSync';

export interface UseWhiteboardAutosaveOptions {
  scope: WhiteboardScope;
  boardId: string;
  canWrite: boolean;
  service?: WhiteboardService;
  debounceMs?: number;
}

export function useWhiteboardAutosave({
  scope,
  boardId,
  canWrite,
  service = whiteboardService,
  debounceMs = WHITEBOARD_AUTOSAVE_DEBOUNCE_MS,
}: UseWhiteboardAutosaveOptions) {
  const scopeKey = whiteboardScopeKey(scope);
  const [board, setBoard] = useState<WhiteboardDetail | null>(null);
  const [assets, setAssets] = useState<WhiteboardAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<WhiteboardSaveState>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [canvasResetTick, setCanvasResetTick] = useState(0);

  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const saveStateRef = useRef<WhiteboardSaveState>('saved');
  const versionRef = useRef(1);
  const lastVersionRef = useRef<number | null>(null);
  const lastFilesRef = useRef('');
  const uploadedIdsRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<WhiteboardSceneSnapshot | null>(null);
  const timerRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const loadSeqRef = useRef(0);

  const setSaveStateSync = useCallback((next: WhiteboardSaveState) => {
    saveStateRef.current = next;
    setSaveState(next);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hydrateBoard = useCallback(async (incrementReset: boolean) => {
    const seq = ++loadSeqRef.current;
    clearTimer();
    pendingRef.current = null;
    queuedRef.current = false;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    try {
      const { detail, assets: loadedAssets } = await loadBoardWithAssets(service, scopeRef.current, boardId);
      if (seq !== loadSeqRef.current) return;
      versionRef.current = detail.version;
      uploadedIdsRef.current = new Set(loadedAssets.map((a) => a.fileId));
      lastVersionRef.current = null;
      lastFilesRef.current = buildFileSignature(loadedAssets.map((a) => a.fileId));
      setBoard(detail);
      setAssets(loadedAssets);
      setSaveStateSync('saved');
      if (incrementReset) setCanvasResetTick((t) => t + 1);
    } catch (err) {
      if (seq === loadSeqRef.current) setLoadError(errorMessage(err, 'Failed to load whiteboard.'));
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [boardId, clearTimer, scopeKey, service, setSaveStateSync]);

  useEffect(() => {
    void hydrateBoard(false);
    return () => clearTimer();
  }, [hydrateBoard, clearTimer]);

  useEffect(() => {
    if (saveState === 'saved') return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveState]);

  const persistSnapshot = useCallback(async (snapshot: WhiteboardSceneSnapshot, expected?: number) => {
    if (!canWrite) return true;
    if (savingRef.current) {
      queuedRef.current = true;
      return false;
    }
    let failed = false;
    savingRef.current = true;
    setSaveStateSync('saving');
    setSaveError(null);
    try {
      const result = await persistSceneWithAssets(
        service, scopeRef.current, boardId, expected ?? versionRef.current, snapshot, uploadedIdsRef.current
      );
      versionRef.current = result.version;
      lastVersionRef.current = snapshot.sceneVersion;
      lastFilesRef.current = snapshot.fileSignature;
      setBoard((prev) => (prev ? { ...prev, ...result } : prev));
      if (pendingRef.current === snapshot) {
        pendingRef.current = null;
        setSaveStateSync('saved');
      }
      return true;
    } catch (err) {
      failed = true;
      queuedRef.current = false;
      const classified = classifySaveError(err);
      setSaveStateSync(classified.state);
      setSaveError(classified.message);
      return false;
    } finally {
      savingRef.current = false;
      if (!failed && queuedRef.current && pendingRef.current && saveStateRef.current !== 'conflict') {
        queuedRef.current = false;
        void persistSnapshot(pendingRef.current);
      }
    }
  }, [boardId, canWrite, service, setSaveStateSync]);

  const handleSceneChange = useCallback((snapshot: WhiteboardSceneSnapshot) => {
    if (lastVersionRef.current === null) {
      lastVersionRef.current = snapshot.sceneVersion;
      lastFilesRef.current = snapshot.fileSignature;
      return;
    }
    if (!canWrite || saveStateRef.current === 'conflict') return;
    if (snapshot.sceneVersion === lastVersionRef.current && snapshot.fileSignature === lastFilesRef.current) return;
    pendingRef.current = snapshot;
    setSaveStateSync('unsaved');
    setSaveError(null);
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (pendingRef.current) void persistSnapshot(pendingRef.current);
    }, debounceMs);
  }, [canWrite, clearTimer, debounceMs, persistSnapshot, setSaveStateSync]);

  const saveNow = useCallback(async () => {
    clearTimer();
    return pendingRef.current ? persistSnapshot(pendingRef.current) : saveStateRef.current === 'saved';
  }, [clearTimer, persistSnapshot]);

  const overwriteServer = useCallback(async () => {
    clearTimer();
    const snapshot = pendingRef.current;
    if (!snapshot) return true;
    try {
      const latest = await service.getBoard(scopeRef.current, boardId);
      versionRef.current = latest.version;
      return await persistSnapshot(snapshot, latest.version);
    } catch (err) {
      setSaveStateSync('error');
      setSaveError(errorMessage(err, 'Failed to fetch latest board version.'));
      return false;
    }
  }, [boardId, clearTimer, persistSnapshot, service, setSaveStateSync]);

  const updateTitle = useCallback(async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed || !canWrite) return;
    const updated = await service.updateBoard(scopeRef.current, boardId, { title: trimmed });
    setBoard((prev) => (prev ? { ...prev, ...updated } : prev));
  }, [boardId, canWrite, service]);

  return {
    board, assets, loading, loadError, saveState, saveError, canvasResetTick,
    clearSaveError: () => setSaveError(null),
    handleSceneChange, saveNow, reloadLatest: () => hydrateBoard(true), overwriteServer, updateTitle,
  };
}
