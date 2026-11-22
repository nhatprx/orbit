import { ArrowLeft, ChevronRight, Cloud, Folder, FolderKanban, Layers } from 'lucide-react';
import type { CloudBreadcrumbItem, CloudNodeDto, CloudScope } from '../../types/cloud.types';
import type { CloudLocationOption } from './cloudLocations';

function LocationIcon({ type }: { type: CloudScope['type'] }) {
  if (type === 'USER') return <Cloud className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />;
  if (type === 'WORKSPACE') return <Layers className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />;
  return <FolderKanban className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />;
}

interface MoveBrowserPanesProps {
  locations: CloudLocationOption[];
  activeKey: string;
  activeLabel: string;
  trail: CloudBreadcrumbItem[];
  folders: CloudNodeDto[];
  selectedFolderId: string | null;
  loading: boolean;
  onSelectLocation: (loc: CloudLocationOption) => void;
  onGoUp: () => void;
  onJumpTrail: (index: number) => void;
  onPickFolder: (folder: CloudNodeDto) => void;
  onDrillFolder: (folder: CloudNodeDto) => void;
}

export function MoveBrowserPanes({
  locations, activeKey, activeLabel, trail, folders, selectedFolderId, loading,
  onSelectLocation, onGoUp, onJumpTrail, onPickFolder, onDrillFolder,
}: MoveBrowserPanesProps) {
  return (
    <div className="grid grid-cols-1 border border-[#30363D] bg-[#0D1117] sm:grid-cols-[190px_1fr]">
      <div className="border-b border-[#30363D] bg-[#161B22] p-2 sm:border-b-0 sm:border-r">
        <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#7D8590]">Locations</p>
        <div className="mt-1 space-y-0.5">
          {locations.map((loc) => {
            const active = loc.key === activeKey;
            return (
              <button
                key={loc.key}
                type="button"
                disabled={!loc.canWrite}
                onClick={() => onSelectLocation(loc)}
                className={`flex w-full items-center gap-2 rounded-none border px-2 py-1.5 text-left text-xs transition-colors ${
                  active
                    ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                    : loc.canWrite
                      ? 'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                      : 'cursor-not-allowed border-transparent text-[#7D8590]/50'
                }`}
              >
                <LocationIcon type={loc.scope.type} />
                <span className="min-w-0 flex-1 truncate">{loc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-1.5 border-b border-[#30363D] bg-[#161B22] px-3 py-2 text-xs">
          <button
            type="button"
            aria-label="Up one folder"
            disabled={trail.length === 0}
            onClick={onGoUp}
            className="flex h-6 w-6 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#22C55E] hover:text-[#22C55E] disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => onJumpTrail(-1)} className="px-1 font-medium text-[#22C55E] hover:underline">
            {activeLabel}
          </button>
          {trail.map((item, idx) => (
            <span key={item.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-[#7D8590]" strokeWidth={1.5} />
              <button type="button" onClick={() => onJumpTrail(idx)} className="max-w-28 truncate text-[#E6EDF3] hover:text-[#22C55E]">
                {item.name}
              </button>
            </span>
          ))}
        </div>

        <div className="h-56 divide-y divide-[#21262D] overflow-y-auto">
          {loading ? (
            <p className="p-4 text-center font-mono text-xs text-[#7D8590]">Loading folders...</p>
          ) : folders.length === 0 ? (
            <p className="p-4 text-center text-xs text-[#7D8590]">No subfolders here.</p>
          ) : (
            folders.map((folder) => {
              const isPicked = selectedFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  onClick={() => onPickFolder(folder)}
                  onDoubleClick={() => onDrillFolder(folder)}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs ${
                    isPicked ? 'bg-[#052E16] text-[#22C55E]' : 'text-[#E6EDF3] hover:bg-[#161B22]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Folder className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                    <span className="truncate">{folder.name}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Open ${folder.name}`}
                    onClick={(e) => { e.stopPropagation(); onDrillFolder(folder); }}
                    className="p-0.5 text-[#7D8590] hover:text-[#22C55E]"
                  >
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
