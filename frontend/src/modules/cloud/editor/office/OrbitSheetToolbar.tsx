import { AlignCenter, AlignLeft, AlignRight, Bold, Download, Highlighter, Italic, Minus, Plus, Underline } from 'lucide-react';
import type { QuickFunctionName, SheetAlign, SheetCellStyleDto, SheetNumberFormat, SheetSummaryStats } from './sheetStyleHelpers';

export type { QuickFunctionName, SheetAlign, SheetCellStyleDto, SheetNumberFormat, SheetSummaryStats };
export {
  computeSheetSummary, expandAndSetRange, exportSheetCsv, formatCellDisplay, getSheetCellClasses, patchCellStyles,
  type SheetRangeBounds,
} from './sheetStyleHelpers';

interface OrbitSheetToolbarProps {
  readOnly?: boolean;
  activeFormat: SheetCellStyleDto;
  onInsertFunction: (fn: QuickFunctionName) => void;
  onToggleStyle: (key: 'bold' | 'italic' | 'underline' | 'highlight') => void;
  onSetAlign: (align: SheetAlign) => void;
  onFormatNumber: (mode: SheetNumberFormat) => void;
  onAddRow: () => void;
  onRemoveRow: () => void;
  onAddColumn: () => void;
  onRemoveColumn: () => void;
  onExportCsv: () => void;
}

const QUICK_FUNCTIONS: QuickFunctionName[] = ['SUM', 'AVG', 'COUNT', 'MAX', 'MIN'];
const NUMBER_MODES: Array<{ mode: SheetNumberFormat; label: string; text: string }> = [
  { mode: 'currency', label: 'Currency $', text: '$' },
  { mode: 'percent', label: 'Percent %', text: '%' },
  { mode: 'number', label: 'Number .00', text: '.00' },
];
const BTN = 'inline-flex items-center gap-1 rounded-none border px-2 py-1 font-mono text-xs transition-colors disabled:opacity-40';
const IDLE = 'border-[#30363D] bg-[#21262D] text-[#E6EDF3] hover:border-[#22C55E] hover:text-[#22C55E]';
const ACTIVE = 'border-[#22C55E] bg-[#052E16] text-[#22C55E]';

export function OrbitSheetToolbar({
  readOnly = false,
  activeFormat,
  onInsertFunction,
  onToggleStyle,
  onSetAlign,
  onFormatNumber,
  onAddRow,
  onRemoveRow,
  onAddColumn,
  onRemoveColumn,
  onExportCsv,
}: OrbitSheetToolbarProps) {
  const align = activeFormat.align ?? 'left';

  return (
    <div role="toolbar" aria-label="Spreadsheet toolbar" className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#30363D] bg-[#161B22] px-3 py-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {QUICK_FUNCTIONS.map((fn) => (
          <button key={fn} type="button" disabled={readOnly} onClick={() => onInsertFunction(fn)} className={`${BTN} ${IDLE}`}>{fn}</button>
        ))}
        <span className="mx-1 h-4 w-px bg-[#30363D]" aria-hidden="true" />
        <button type="button" aria-label="Bold" aria-pressed={Boolean(activeFormat.bold)} disabled={readOnly} onClick={() => onToggleStyle('bold')} className={`${BTN} ${activeFormat.bold ? ACTIVE : IDLE}`}>
          <Bold className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button type="button" aria-label="Italic" aria-pressed={Boolean(activeFormat.italic)} disabled={readOnly} onClick={() => onToggleStyle('italic')} className={`${BTN} ${activeFormat.italic ? ACTIVE : IDLE}`}>
          <Italic className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button type="button" aria-label="Underline" aria-pressed={Boolean(activeFormat.underline)} disabled={readOnly} onClick={() => onToggleStyle('underline')} className={`${BTN} ${activeFormat.underline ? ACTIVE : IDLE}`}>
          <Underline className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button type="button" aria-label="Highlight cell" aria-pressed={Boolean(activeFormat.highlight)} disabled={readOnly} onClick={() => onToggleStyle('highlight')} className={`${BTN} ${activeFormat.highlight ? ACTIVE : IDLE}`}>
          <Highlighter className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <span className="mx-1 h-4 w-px bg-[#30363D]" aria-hidden="true" />
        {(['left', 'center', 'right'] as const).map((dir) => {
          const Icon = dir === 'left' ? AlignLeft : dir === 'center' ? AlignCenter : AlignRight;
          return (
            <button key={dir} type="button" aria-label={`Align ${dir}`} aria-pressed={align === dir} disabled={readOnly} onClick={() => onSetAlign(dir)} className={`${BTN} ${align === dir ? ACTIVE : IDLE}`}>
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-[#30363D]" aria-hidden="true" />
        {NUMBER_MODES.map(({ mode, label, text }) => (
          <button key={mode} type="button" aria-label={label} aria-pressed={activeFormat.numFmt === mode} disabled={readOnly} onClick={() => onFormatNumber(mode)} className={`${BTN} ${activeFormat.numFmt === mode ? ACTIVE : IDLE}`}>{text}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {!readOnly && (
          <>
            <button type="button" aria-label="Add row" onClick={onAddRow} className={`${BTN} ${IDLE}`}><Plus className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> Row</button>
            <button type="button" aria-label="Remove row" onClick={onRemoveRow} className={`${BTN} ${IDLE}`}><Minus className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> Row</button>
            <button type="button" aria-label="Add column" onClick={onAddColumn} className={`${BTN} ${IDLE}`}><Plus className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> Col</button>
            <button type="button" aria-label="Remove column" onClick={onRemoveColumn} className={`${BTN} ${IDLE}`}><Minus className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> Col</button>
          </>
        )}
        <button type="button" onClick={onExportCsv} className={`${BTN} ${IDLE}`}><Download className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> Export CSV</button>
      </div>
    </div>
  );
}
