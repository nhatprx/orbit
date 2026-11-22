import { AlertCircle, AlertTriangle, RefreshCw, Upload, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { WhiteboardSaveState } from '../../types/whiteboard.types';

interface WhiteboardConflictBannerProps {
  saveState: WhiteboardSaveState;
  saveError: string | null;
  onReloadLatest: () => void;
  onOverwriteServer: () => void;
  onDismissError: () => void;
}

export function WhiteboardConflictBanner({
  saveState,
  saveError,
  onReloadLatest,
  onOverwriteServer,
  onDismissError,
}: WhiteboardConflictBannerProps) {
  if (saveState === 'conflict') {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAB308] bg-[#EAB308]/10 px-4 py-2 text-xs text-[#E6EDF3]"
      >
        <div className="flex items-center gap-2 text-[#EAB308]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>
            Version conflict: another session saved a newer revision of this whiteboard.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onReloadLatest}>
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
            Reload latest
          </Button>
          <Button type="button" variant="primary" onClick={onOverwriteServer}>
            <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
            Overwrite server
          </Button>
        </div>
      </div>
    );
  }

  if (!saveError) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-2 border-b border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-2 text-xs text-[#EF4444]"
    >
      <span className="flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        {saveError}
      </span>
      <button type="button" aria-label="Dismiss save error" onClick={onDismissError}>
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
