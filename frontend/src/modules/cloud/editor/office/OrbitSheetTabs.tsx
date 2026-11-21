import { useState, type KeyboardEvent } from 'react';
import { Check, Edit3, Plus, Trash2 } from 'lucide-react';
import type { SheetTabDto } from './officeTypes';
import type { SheetSummaryStats } from './OrbitSheetToolbar';

interface OrbitSheetFormulaBarProps {
  rangeCoord: string;
  activeRaw: string;
  readOnly?: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function OrbitSheetFormulaBar({
  rangeCoord, activeRaw, readOnly = false, onFocus, onBlur, onChange, onKeyDown,
}: OrbitSheetFormulaBarProps) {
  return (
    <div className="flex items-center border-b border-[#30363D] bg-[#161B22]">
      <div aria-label="Active cell address" className="min-w-[68px] border-r border-[#30363D] bg-[#0D1117] px-2.5 py-1.5 text-center font-mono text-xs font-semibold text-[#22C55E]">
        {rangeCoord}
      </div>
      <span className="border-r border-[#30363D] px-2.5 py-1.5 font-mono text-xs italic text-[#8B949E]">fx</span>
      <input
        type="text"
        aria-label="Formula bar"
        readOnly={readOnly}
        value={activeRaw}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Enter value or formula (e.g. =SUM(A1:B3))"
        className="min-w-0 flex-1 rounded-none bg-[#0D1117] px-3 py-1.5 font-mono text-xs text-[#E6EDF3] focus:outline-none"
      />
      {activeRaw.trim().startsWith('=') && (
        <span className="border-l border-[#30363D] bg-[#052E16] px-2.5 py-1.5 font-mono text-[11px] text-[#22C55E]">
          Pick a cell or type expression, press Enter to apply
        </span>
      )}
    </div>
  );
}

interface OrbitSheetTabsProps {
  sheets: SheetTabDto[];
  activeIdx: number;
  readOnly?: boolean;
  selectionLabel?: string;
  summary?: SheetSummaryStats;
  onSelect: (index: number) => void;
  onAddSheet: () => void;
  onRenameSheet: (index: number, name: string) => void;
  onDeleteSheet: (index: number) => void;
}

export function OrbitSheetTabs({
  sheets, activeIdx, readOnly = false, selectionLabel, summary, onSelect, onAddSheet, onRenameSheet, onDeleteSheet,
}: OrbitSheetTabsProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');

  const startRename = (idx: number, currentName: string) => { setEditingIdx(idx); setDraftName(currentName); };
  const commitRename = (idx: number) => {
    const trimmed = draftName.trim();
    if (trimmed) onRenameSheet(idx, trimmed);
    setEditingIdx(null);
  };

  return (
    <>
      {summary && (
        <div aria-label="Selection summary" className="flex flex-wrap items-center justify-between gap-2 border-t border-[#30363D] bg-[#0D1117] px-3 py-1 font-mono text-[11px] text-[#8B949E]">
          <span>{selectionLabel}</span>
          <div className="flex items-center gap-4">
            <span>COUNT: <strong className="text-[#E6EDF3]">{summary.count}</strong></span>
            <span>SUM: <strong className="text-[#22C55E]">{summary.sum}</strong></span>
            <span>AVG: <strong className="text-[#E6EDF3]">{summary.avg}</strong></span>
            <span>MIN: <strong className="text-[#E6EDF3]">{summary.min}</strong></span>
            <span>MAX: <strong className="text-[#E6EDF3]">{summary.max}</strong></span>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#30363D] bg-[#161B22] px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {sheets.map((sheet, idx) => {
            const isActive = idx === activeIdx;
            return (
              <div
                key={idx}
                className={`inline-flex items-center rounded-none border text-xs ${
                  isActive ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]' : 'border-[#30363D] bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3]'
                }`}
              >
                {editingIdx === idx ? (
                  <div className="flex items-center px-1.5 py-0.5">
                    <input
                      type="text" aria-label="Sheet tab name" value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitRename(idx); if (e.key === 'Escape') setEditingIdx(null); }}
                      className="w-24 rounded-none bg-[#0D1117] px-1.5 py-0.5 font-mono text-xs text-[#E6EDF3] focus:outline-none"
                    />
                    <button type="button" aria-label="Confirm sheet rename" onClick={() => commitRename(idx)} className="ml-1 rounded-none p-0.5 text-[#22C55E]">
                      <Check className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => onSelect(idx)} onDoubleClick={() => { if (!readOnly) startRename(idx, sheet.name); }} className="rounded-none px-3 py-1 font-mono text-xs font-medium">
                    {sheet.name}
                  </button>
                )}
                {!readOnly && isActive && editingIdx !== idx && (
                  <div className="flex items-center border-l border-[#22C55E]/40 px-1">
                    <button type="button" aria-label={`Rename ${sheet.name}`} onClick={() => startRename(idx, sheet.name)} className="rounded-none p-1 text-[#8B949E] hover:text-[#22C55E]">
                      <Edit3 className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                    {sheets.length > 1 && (
                      <button type="button" aria-label={`Delete ${sheet.name}`} onClick={() => onDeleteSheet(idx)} className="rounded-none p-1 text-[#8B949E] hover:text-[#EF4444]">
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!readOnly && (
            <button type="button" onClick={onAddSheet} className="inline-flex items-center gap-1 rounded-none border border-[#30363D] bg-[#21262D] px-2.5 py-1 font-mono text-xs text-[#E6EDF3] hover:border-[#22C55E] hover:text-[#22C55E]">
              <Plus className="h-3 w-3" strokeWidth={1.5} /> Add Sheet
            </button>
          )}
        </div>
        <span className="font-mono text-[11px] text-[#8B949E]">Formulas: =SUM(A1:B3), =AVG(...), =MIN(...), =MAX(...), =COUNT(...)</span>
      </div>
    </>
  );
}
