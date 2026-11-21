import type { KeyboardEvent, MouseEvent, MutableRefObject } from 'react';
import { formatCellDisplay, getSheetCellClasses, type SheetAlign, type SheetCellStyleDto, type SheetRangeBounds } from './sheetStyleHelpers';
import { columnLabel, evaluateSheetCell, isFormulaExpectingRef, isNumericValue } from './sheetFormulas';

interface OrbitSheetGridProps {
  rawRows: string[][];
  cellStyles: Record<string, SheetCellStyleDto>;
  displayRowCount: number;
  displayColCount: number;
  activeCell: { r: number; c: number };
  editingCell: { r: number; c: number } | null;
  bounds: SheetRangeBounds;
  formulaRefs: Set<string>;
  readOnly: boolean;
  cellRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  onMouseDown: (e: MouseEvent<HTMLInputElement>, r: number, c: number, isEditing: boolean) => void;
  onDragEnter: (r: number, c: number) => void;
  onClick: (e: MouseEvent<HTMLInputElement>, r: number, c: number, isEditing: boolean) => void;
  onDoubleClick: (r: number, c: number) => void;
  onBlur: (r: number, c: number) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>, r: number, c: number) => void;
  onChange: (r: number, c: number, value: string) => void;
}

export function OrbitSheetGrid({
  rawRows, cellStyles, displayRowCount, displayColCount, activeCell, editingCell, bounds, formulaRefs,
  readOnly, cellRefs, onMouseDown, onDragEnter, onClick, onDoubleClick, onBlur, onKeyDown, onChange,
}: OrbitSheetGridProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#0D1117]">
      <table className="border-collapse font-mono text-xs">
        <thead>
          <tr className="h-7">
            <th className="sticky left-0 top-0 z-20 h-7 w-10 min-w-[40px] border border-[#30363D] bg-[#161B22] px-2 text-center text-[#8B949E]">#</th>
            {Array.from({ length: displayColCount }, (_, cIdx) => (
              <th
                key={cIdx}
                className={`sticky top-0 z-10 h-7 w-28 min-w-[112px] border border-[#30363D] px-2 text-center font-semibold ${
                  cIdx >= bounds.minC && cIdx <= bounds.maxC ? 'bg-[#052E16] text-[#22C55E]' : 'bg-[#161B22] text-[#8B949E]'
                }`}
              >
                {columnLabel(cIdx)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: displayRowCount }, (_, rIdx) => (
            <tr key={rIdx} className="h-7">
              <td
                className={`sticky left-0 z-10 h-7 w-10 min-w-[40px] border border-[#30363D] px-2 text-center font-semibold ${
                  rIdx >= bounds.minR && rIdx <= bounds.maxR ? 'bg-[#052E16] text-[#22C55E]' : 'bg-[#161B22] text-[#8B949E]'
                }`}
              >
                {rIdx + 1}
              </td>
              {Array.from({ length: displayColCount }, (_, cIdx) => {
                const raw = rawRows[rIdx]?.[cIdx] ?? '';
                const isEditing = editingCell?.r === rIdx && editingCell?.c === cIdx;
                const isSelected = activeCell.r === rIdx && activeCell.c === cIdx;
                const inRange = rIdx >= bounds.minR && rIdx <= bounds.maxR && cIdx >= bounds.minC && cIdx <= bounds.maxC;
                const isFormulaRef = !isSelected && formulaRefs.has(`${rIdx}:${cIdx}`);
                const fmt = cellStyles[`${rIdx}:${cIdx}`];
                const evaluated = raw ? evaluateSheetCell(raw, rawRows, rIdx, cIdx) : '';
                const display = !raw || isEditing || (isSelected && isFormulaExpectingRef(raw)) ? raw : formatCellDisplay(evaluated, fmt);
                const effAlign: SheetAlign = fmt?.align ?? (isNumericValue(evaluated) ? 'right' : 'left');
                const { tdCls, inputCls } = getSheetCellClasses(isSelected, isFormulaRef, inRange, effAlign, fmt);
                return (
                  <td key={cIdx} onMouseEnter={() => onDragEnter(rIdx, cIdx)} className={`relative h-7 w-28 min-w-[112px] border p-0 ${tdCls}`}>
                    <input
                      ref={(el) => { cellRefs.current[`${rIdx}:${cIdx}`] = el; }}
                      type="text"
                      aria-label={`Cell ${columnLabel(cIdx)}${rIdx + 1}`}
                      readOnly={readOnly}
                      value={display}
                      onMouseDown={(e) => onMouseDown(e, rIdx, cIdx, isEditing)}
                      onMouseEnter={() => onDragEnter(rIdx, cIdx)}
                      onClick={(e) => onClick(e, rIdx, cIdx, isEditing)}
                      onDoubleClick={() => onDoubleClick(rIdx, cIdx)}
                      onBlur={() => onBlur(rIdx, cIdx)}
                      onKeyDown={(e) => onKeyDown(e, rIdx, cIdx)}
                      onChange={(e) => onChange(rIdx, cIdx, e.target.value)}
                      className={inputCls}
                    />
                    {rIdx === bounds.maxR && cIdx === bounds.maxC && (
                      <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-1.5 bg-[#22C55E]" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
