import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { errorMessage } from '../../services/workspace/httpClient';
import { whiteboardService, type WhiteboardService } from '../../services/whiteboard/whiteboard.service';
import type { WhiteboardCanvasTheme, WhiteboardScope } from '../../types/whiteboard.types';
import type { WhiteboardCanvasActions } from './ExcalidrawCanvas';
import { useWhiteboardAutosave } from './useWhiteboardAutosave';
import { useWhiteboardCollab } from './useWhiteboardCollab';
import { WhiteboardConflictBanner } from './WhiteboardConflictBanner';
import { WhiteboardErrorBoundary } from './WhiteboardErrorBoundary';
import { WhiteboardToolbar } from './WhiteboardToolbar';

const LazyExcalidrawCanvas = lazy(() => import('./ExcalidrawCanvas'));

interface WhiteboardWorkspaceProps {
  scope: WhiteboardScope;
  boardId: string;
  canWrite: boolean;
  canManage?: boolean;
  service?: WhiteboardService;
  onBack: () => void;
}

export function WhiteboardWorkspace({
  scope, boardId, canWrite, canManage = false, service = whiteboardService, onBack,
}: WhiteboardWorkspaceProps) {
  const notifyAssetRef = useRef<(fileId: string) => void>(() => {});
  const state = useWhiteboardAutosave({
    scope, boardId, canWrite, service, autoReconcileConflict: true,
    onAssetUploaded: (fileId) => notifyAssetRef.current(fileId),
  });
  const [canvasTheme, setCanvasTheme] = useState<WhiteboardCanvasTheme>('dark');
  const [actions, setActions] = useState<WhiteboardCanvasActions | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lockPending, setLockPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isLocked = Boolean(state.board?.locked);
  const effectiveCanWrite = canWrite && !isLocked;
  const canToggleLock = Boolean(state.board?.canToggleLock ?? canManage);

  const collab = useWhiteboardCollab({
    boardId, canWrite: effectiveCanWrite, enabled: Boolean(state.board),
    onSceneChange: state.handleSceneChange,
    onRemoteCheckpoint: state.applyRemoteCheckpoint,
    onRemoteLockChanged: state.applyRemoteLock,
    onRemoteAssetReady: () => void state.refreshAssets(),
  });
  notifyAssetRef.current = collab.notifyAssetUploaded;

  const handleToggleLock = useCallback(async () => {
    if (!state.board || !service.setLocked || lockPending) return;
    setLockPending(true);
    setActionError(null);
    const nextLocked = !isLocked;
    try {
      const updated = await service.setLocked(scope, boardId, nextLocked);
      state.applyRemoteLock(Boolean(updated.locked ?? nextLocked), updated.lockedBy, updated.lockedAt);
    } catch (err) {
      setActionError(errorMessage(err, 'Failed to update whiteboard lock.'));
    } finally {
      setLockPending(false);
    }
  }, [boardId, isLocked, lockPending, scope, service, state]);

  const handleBack = useCallback(async () => {
    if (effectiveCanWrite && (state.saveState === 'unsaved' || state.saveState === 'error')) {
      await state.saveNow();
    }
    onBack();
  }, [effectiveCanWrite, onBack, state]);

  const handleToggleTheme = useCallback(() => {
    setCanvasTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const runCanvasAction = useCallback(async (fn: () => Promise<void> | void, fallback: string) => {
    setActionError(null);
    try { await fn(); } catch (err) { setActionError(errorMessage(err, fallback)); }
  }, []);

  if (state.loading && !state.board) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0D1117]">
        <LoadingView label="Loading whiteboard..." />
      </div>
    );
  }

  if (state.loadError || !state.board) {
    return (
      <div className="flex h-full w-full flex-col gap-4 bg-[#0D1117] p-6">
        <ErrorView message={state.loadError ?? 'Whiteboard not found.'} onRetry={() => void state.reloadLatest()} />
        <div>
          <button type="button" onClick={onBack} className="border border-[#3B434B] bg-[#21262D] px-3 py-1.5 text-xs text-[#E6EDF3] hover:border-[#22C55E]">
            Back to Boards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0D1117]">
      <WhiteboardToolbar
        title={state.board.title} canWrite={effectiveCanWrite} locked={isLocked}
        canToggleLock={canToggleLock} lockPending={lockPending} participants={collab.participants}
        saveState={state.saveState} canvasTheme={canvasTheme} exportReady={actions !== null}
        onBack={() => void handleBack()} onRenameTitle={state.updateTitle}
        onToggleLock={() => void handleToggleLock()} onSaveNow={() => void state.saveNow()}
        onToggleTheme={handleToggleTheme}
        onExportPng={() => actions && void runCanvasAction(() => actions.exportPng(), 'Failed to export PNG.')}
        onExportSvg={() => actions && void runCanvasAction(() => actions.exportSvg(), 'Failed to export SVG.')}
        onExportJson={() => actions && void runCanvasAction(() => actions.exportExcalidraw(), 'Failed to export board.')}
        onImportFile={(file) => actions && void runCanvasAction(() => actions.importFile(file), 'Invalid .excalidraw file.')}
        fileInputRef={fileInputRef}
      />

      {isLocked && (
        <div data-testid="whiteboard-locked-banner" role="status" className="flex items-center gap-2 border-b border-[#EAB308]/40 bg-[#EAB308]/10 px-4 py-1.5 text-xs text-[#EAB308]">
          <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>This whiteboard is locked by the owner. Unlock to edit.</span>
        </div>
      )}

      <WhiteboardConflictBanner
        saveState={state.saveState} saveError={actionError ?? state.saveError}
        onReloadLatest={() => void state.reloadLatest()} onOverwriteServer={() => void state.overwriteServer()}
        onDismissError={() => { setActionError(null); state.clearSaveError(); }}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <WhiteboardErrorBoundary onBack={onBack}>
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-[#0D1117]"><LoadingView label="Initializing whiteboard canvas..." /></div>}>
            <LazyExcalidrawCanvas
              boardId={state.board.id} resetTick={state.canvasResetTick} title={state.board.title}
              sceneJson={state.board.sceneJson} assets={state.assets} canWrite={effectiveCanWrite}
              canvasTheme={canvasTheme} isCollaborating onToggleTheme={handleToggleTheme}
              onSceneChange={collab.handleCollabSceneChange} onPointerUpdate={collab.handlePointerUpdate}
              onRequestImport={() => fileInputRef.current?.click()} onActionsReady={setActions}
              onApiReady={collab.handleApiReady}
            />
          </Suspense>
        </WhiteboardErrorBoundary>
      </div>
    </div>
  );
}
