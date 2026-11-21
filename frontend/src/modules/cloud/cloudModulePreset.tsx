import { Filter } from 'lucide-react';
import type { CloudNodeDto, DocumentTemplateType } from '../../types/cloud.types';
import { getFileExtension } from './editor/fileEditorRegistry';

export type CloudModulePreset = 'cloud' | 'docs' | 'sheets';

export interface CloudPresetConfig {
  id: CloudModulePreset;
  label: string | null;
  shortLabel: string;
  extensions: ReadonlySet<string> | null;
  defaultTemplate: DocumentTemplateType;
}

const PRESETS: Record<CloudModulePreset, CloudPresetConfig> = {
  cloud: { id: 'cloud', label: null, shortLabel: 'All Files', extensions: null, defaultTemplate: 'MD' },
  docs: {
    id: 'docs',
    label: 'Documents (.docx, .md, .txt, .pdf)',
    shortLabel: 'Documents',
    extensions: new Set(['docx', 'md', 'txt', 'pdf']),
    defaultTemplate: 'DOCX',
  },
  sheets: {
    id: 'sheets',
    label: 'Spreadsheets (.xlsx, .csv)',
    shortLabel: 'Spreadsheets',
    extensions: new Set(['xlsx', 'csv']),
    defaultTemplate: 'XLSX',
  },
};

export function getCloudPresetConfig(preset: CloudModulePreset = 'cloud'): CloudPresetConfig {
  return PRESETS[preset];
}

export function filterNodesByPreset(
  nodes: CloudNodeDto[],
  preset: CloudPresetConfig,
  filterEnabled: boolean
): CloudNodeDto[] {
  if (!filterEnabled || !preset.extensions) return nodes;
  return nodes.filter((node) => node.nodeType === 'FOLDER' || preset.extensions!.has(getFileExtension(node.name)));
}

interface CloudPresetFilterBarProps {
  preset: CloudPresetConfig;
  filterEnabled: boolean;
  onToggle: () => void;
}

export function CloudPresetFilterBar({ preset, filterEnabled, onToggle }: CloudPresetFilterBarProps) {
  if (!preset.label) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[#30363D] bg-[#0D1117] px-4 py-1.5 font-mono text-[11px]">
      <span className="flex items-center gap-2 text-[#8B949E]">
        <Filter className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />
        {filterEnabled ? (
          <span>
            Filter: <strong className="font-semibold text-[#22C55E]">{preset.label}</strong>
          </span>
        ) : (
          <span>Showing all files in scope</span>
        )}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="rounded-none border border-[#30363D] bg-[#161B22] px-2 py-0.5 text-[11px] text-[#E6EDF3] transition-colors hover:border-[#22C55E] hover:text-[#22C55E]"
      >
        {filterEnabled ? 'Show all files' : `Filter to ${preset.shortLabel}`}
      </button>
    </div>
  );
}
