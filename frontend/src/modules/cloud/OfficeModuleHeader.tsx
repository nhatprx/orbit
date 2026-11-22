import { useRef } from 'react';
import {
  FilePlus2,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  List,
  Presentation,
  Upload,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { CloudPermissions } from '../../types/cloud.types';
import type { OfficeModuleKey } from './cloudModulePreset';

export type OfficeViewMode = 'list' | 'icons';

interface OfficeModuleHeaderProps {
  officeModule: OfficeModuleKey;
  title: string;
  newLabel: string;
  scopeLabel?: string;
  viewMode: OfficeViewMode;
  permissions: CloudPermissions;
  onViewModeChange: (mode: OfficeViewMode) => void;
  onOpenNewDocument: () => void;
  onUploadFiles: (files: File[]) => void;
}

function OfficeHeaderIcon({ module }: { module: OfficeModuleKey }) {
  if (module === 'sheets') return <FileSpreadsheet className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />;
  if (module === 'slides') return <Presentation className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />;
  return <FileText className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />;
}

const MODES: Array<{ id: OfficeViewMode; label: string; icon: typeof List }> = [
  { id: 'icons', label: 'Icons view', icon: LayoutGrid },
  { id: 'list', label: 'List view', icon: List },
];

export function OfficeModuleHeader({
  officeModule,
  title,
  newLabel,
  scopeLabel,
  viewMode,
  permissions,
  onViewModeChange,
  onOpenNewDocument,
  onUploadFiles,
}: OfficeModuleHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] bg-[#161B22] px-4 py-2">
      <div className="flex items-center gap-2.5">
        <OfficeHeaderIcon module={officeModule} />
        <h1 className="text-sm font-semibold text-[#E6EDF3]">{title}</h1>
        {scopeLabel && (
          <span className="border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#22C55E]">
            {scopeLabel}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="View mode" className="flex items-center border border-[#30363D] bg-[#0D1117]">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = viewMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                title={m.label}
                aria-label={m.label}
                aria-pressed={active}
                onClick={() => onViewModeChange(m.id)}
                className={`flex h-7 w-7 items-center justify-center border-r border-[#30363D] last:border-r-0 transition-colors ${
                  active ? 'bg-[#052E16] text-[#22C55E]' : 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>

        {permissions.canWrite && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              aria-label="Upload office files"
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                if (list.length > 0) onUploadFiles(list);
                e.target.value = '';
              }}
            />
            <Button type="button" variant="primary" onClick={onOpenNewDocument} className="px-2.5 py-1 text-xs">
              <FilePlus2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              {newLabel}
            </Button>
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} className="px-2.5 py-1 text-xs">
              <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
              Upload
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
