import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { errorMessage } from '../../services/workspace/httpClient';
import type { WhiteboardService } from '../../services/whiteboard/whiteboard.service';
import type {
  WhiteboardCanvasTheme,
  WhiteboardScope,
} from '../../types/whiteboard.types';
import type { WhiteboardCanvasActions } from './ExcalidrawCanvas';
import { useWhiteboardAutosave } from './useWhiteboardAutosave';
import { WhiteboardConflictBanner } from './WhiteboardConflictBanner';
import { WhiteboardErrorBoundary } from './WhiteboardErrorBoundary';
import { WhiteboardToolbar } from './WhiteboardToolbar';

const LazyExcalidrawCanvas = lazy(() => import('./ExcalidrawCanvas'));

interface WhiteboardWorkspaceProps {
  scope: WhiteboardScope;
  boardId: string;
  canWrite: boolean;
  service?: WhiteboardService;
  onBack: () => void;
}

export function WhiteboardWorkspace({
  scope,
  boardId,
  canWrite,
  service,
  onBack,
}: WhiteboardWorkspaceProps) {
  const state = useWhiteboardAutosave({ scope, boardId, canWrite, service });
  const [canvasTheme, setCanvasTheme] = useState<WhiteboardCanvasTheme>('dark');
  const [actions, setActions] = useState<WhiteboardCanvasActions | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleBack = useCallback(async () => {
    if (canWrite && (state.saveState === 'unsaved' || state.saveState === 'error')) {
      await state.saveNow();
    }
    onBack();
  }, [canWrite, onBack, state]);

  const handleToggleTheme = useCallback(() => {
    setCanvasTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const runCanvasAction = useCallback(async (fn: () => Promise<void> | void, fallback: string) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(errorMessage(err, fallback));
    }
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
        <ErrorView
          message={state.loadError ?? 'Whiteboard not found.'}
          onRetry={() => void state.reloadLatest()}
        />
        <div>
          <button
            type="button"
            onClick={onBack}
            className="border border-[#3B434B] bg-[#21262D] px-3 py-1.5 text-xs text-[#E6EDF3] hover:border-[#22C55E]"
          >
            Back to Boards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0D1117]">
      <WhiteboardToolbar
        title={state.board.title}
        canWrite={canWrite}
        saveState={state.saveState}
        canvasTheme={canvasTheme}
        exportReady={actions !== null}
        onBack={() => void handleBack()}
        onRenameTitle={state.updateTitle}
        onSaveNow={() => void state.saveNow()}
        onToggleTheme={handleToggleTheme}
        onExportPng={() =>
          actions && void runCanvasAction(() => actions.exportPng(), 'Failed to export PNG.')
        }
        onExportSvg={() =>
          actions && void runCanvasAction(() => actions.exportSvg(), 'Failed to export SVG.')
        }
        onExportJson={() =>
          actions && void runCanvasAction(() => actions.exportExcalidraw(), 'Failed to export board.')
        }
        onImportFile={(file) =>
          actions &&
          void runCanvasAction(() => actions.importFile(file), 'Invalid .excalidraw file.')
        }
        fileInputRef={fileInputRef}
      />

      <WhiteboardConflictBanner
        saveState={state.saveState}
        saveError={actionError ?? state.saveError}
        onReloadLatest={() => void state.reloadLatest()}
        onOverwriteServer={() => void state.overwriteServer()}
        onDismissError={() => {
          setActionError(null);
          state.clearSaveError();
        }}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <WhiteboardErrorBoundary onBack={onBack}>
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-[#0D1117]">
                <LoadingView label="Initializing whiteboard canvas..." />
              </div>
            }
          >
            <LazyExcalidrawCanvas
              boardId={state.board.id}
              resetTick={state.canvasResetTick}
              title={state.board.title}
              sceneJson={state.board.sceneJson}
              assets={state.assets}
              canWrite={canWrite}
              canvasTheme={canvasTheme}
              onToggleTheme={handleToggleTheme}
              onSceneChange={state.handleSceneChange}
              onRequestImport={() => fileInputRef.current?.click()}
              onActionsReady={setActions}
            />
          </Suspense>
        </WhiteboardErrorBoundary>
      </div>
    </div>
  );
}
