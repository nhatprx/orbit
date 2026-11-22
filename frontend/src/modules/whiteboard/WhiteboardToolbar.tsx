import { useEffect, useState, type ChangeEvent, type KeyboardEvent, type RefObject } from 'react';
import { ArrowLeft, Lock, Moon, Save, Sun, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { CollabParticipant } from '../../types/collab.types';
import type { WhiteboardCanvasTheme, WhiteboardSaveState } from '../../types/whiteboard.types';
import { CollabPresenceBar } from '../collab/CollabPresenceBar';
import { WhiteboardExportMenu } from './WhiteboardExportMenu';
import { WHITEBOARD_MAX_TITLE_LENGTH } from './whiteboardPermissions';

interface WhiteboardToolbarProps {
  title: string;
  canWrite: boolean;
  locked?: boolean;
  canToggleLock?: boolean;
  lockPending?: boolean;
  participants?: readonly CollabParticipant[];
  saveState: WhiteboardSaveState;
  canvasTheme: WhiteboardCanvasTheme;
  exportReady: boolean;
  onBack: () => void;
  onRenameTitle: (title: string) => Promise<void>;
  onToggleLock?: () => void;
  onSaveNow: () => void;
  onToggleTheme: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  onImportFile: (file: File) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

const SAVE_META: Record<WhiteboardSaveState, { label: string; color: string }> = {
  saved: { label: 'Saved', color: 'bg-[#22C55E]' },
  saving: { label: 'Saving...', color: 'bg-[#4ADE80] animate-pulse' },
  unsaved: { label: 'Unsaved', color: 'bg-[#EAB308]' },
  conflict: { label: 'Conflict', color: 'bg-[#EF4444]' },
  error: { label: 'Error', color: 'bg-[#EF4444]' },
};

export function WhiteboardToolbar({
  title, canWrite, locked = false, canToggleLock = false, lockPending = false,
  participants = [], saveState, canvasTheme, exportReady, onBack, onRenameTitle,
  onToggleLock, onSaveNow, onToggleTheme, onExportPng, onExportSvg, onExportJson,
  onImportFile, fileInputRef,
}: WhiteboardToolbarProps) {
  const [draftTitle, setDraftTitle] = useState(title);
  useEffect(() => { setDraftTitle(title); }, [title]);

  function commitTitle() {
    const trimmed = draftTitle.trim();
    if (!trimmed) { setDraftTitle(title); return; }
    if (trimmed !== title) void onRenameTitle(trimmed);
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') { setDraftTitle(title); event.currentTarget.blur(); }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onImportFile(file);
  }

  const status = SAVE_META[saveState];

  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Button type="button" variant="ghost" onClick={onBack} className="px-2 py-1 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Boards
        </Button>
        <span className="h-4 w-px bg-[#30363D]" />
        {canWrite ? (
          <input
            aria-label="Whiteboard title"
            value={draftTitle}
            maxLength={WHITEBOARD_MAX_TITLE_LENGTH}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleTitleKeyDown}
            className="min-w-0 max-w-xs border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-[#E6EDF3] hover:border-[#30363D] focus:border-[#22C55E] focus:bg-[#0D1117] focus:outline-none"
          />
        ) : (
          <span className="truncate text-sm font-medium text-[#E6EDF3]">{title}</span>
        )}
        {!canWrite && (
          <span className="inline-flex items-center gap-1.5 border border-[#30363D] bg-[#21262D] px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-[#BDBDBD]">
            <Lock className="h-3 w-3 text-[#8A8A8A]" strokeWidth={1.5} />
            Read-only
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CollabPresenceBar
          participants={participants}
          locked={locked}
          canToggleLock={canToggleLock}
          lockPending={lockPending}
          onToggleLock={onToggleLock}
        />

        {canWrite && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2 py-1 font-mono text-[11px] text-[#BDBDBD]"
          >
            <span className={`h-1.5 w-1.5 ${status.color}`} />
            {status.label}
          </span>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={onToggleTheme}
          className="px-2 py-1 text-xs"
          aria-label="Toggle canvas theme"
        >
          {canvasTheme === 'dark' ? <Sun className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />}
          <span className="hidden sm:inline">{canvasTheme === 'dark' ? 'Dark' : 'Light'}</span>
        </Button>

        {canWrite && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".excalidraw,application/json"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Import excalidraw file"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!exportReady}
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 text-xs"
            >
              <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden md:inline">Import</span>
            </Button>
          </>
        )}

        <WhiteboardExportMenu
          disabled={!exportReady}
          onExportPng={onExportPng}
          onExportSvg={onExportSvg}
          onExportJson={onExportJson}
        />

        {canWrite && (
          <Button
            type="button"
            variant="primary"
            disabled={saveState === 'saving' || saveState === 'conflict'}
            onClick={onSaveNow}
            className="px-2.5 py-1 text-xs"
          >
            <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
            Save
          </Button>
        )}
      </div>
    </header>
  );
}
