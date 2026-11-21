import { useEffect, useRef } from 'react';
import { isFormulaExpectingRef } from './sheetFormulas';
import { formatFormulaRange } from './sheetFormulaSuggest';

interface FormulaDragState {
  anchorR: number;
  anchorC: number;
  basePrefix: string;
  startR: number;
  startC: number;
  endR: number;
  endC: number;
}

interface UseSheetFormulaDragArgs {
  readOnly: boolean;
  isEditingActive: boolean;
  activeCell: { r: number; c: number };
  activeRaw: string;
  onSetCellValue: (r: number, c: number, val: string, recordHistory?: boolean) => void;
  onBeginFormulaEdit: (r: number, c: number) => void;
  onFocusFormulaEditor: (r: number, c: number) => void;
  onEndNormalDrag: () => void;
}

export function useSheetFormulaDrag({
  readOnly,
  isEditingActive,
  activeCell,
  activeRaw,
  onSetCellValue,
  onBeginFormulaEdit,
  onFocusFormulaEditor,
  onEndNormalDrag,
}: UseSheetFormulaDragArgs) {
  const formulaDragRef = useRef<FormulaDragState | null>(null);
  const justPickedRef = useRef(false);

  const startFormulaDrag = (rIdx: number, cIdx: number): boolean => {
    if (readOnly || !isEditingActive || (rIdx === activeCell.r && cIdx === activeCell.c) || !isFormulaExpectingRef(activeRaw)) {
      return false;
    }
    onBeginFormulaEdit(activeCell.r, activeCell.c);
    formulaDragRef.current = {
      anchorR: activeCell.r,
      anchorC: activeCell.c,
      basePrefix: activeRaw,
      startR: rIdx,
      startC: cIdx,
      endR: rIdx,
      endC: cIdx,
    };
    justPickedRef.current = true;
    const refStr = formatFormulaRange(rIdx, cIdx, rIdx, cIdx);
    onSetCellValue(activeCell.r, activeCell.c, `${activeRaw}${refStr}`, true);
    return true;
  };

  const updateFormulaDrag = (rIdx: number, cIdx: number): boolean => {
    const drag = formulaDragRef.current;
    if (!drag) return false;
    if (rIdx === drag.anchorR && cIdx === drag.anchorC) return true;
    if (rIdx === drag.endR && cIdx === drag.endC) return true;
    drag.endR = rIdx;
    drag.endC = cIdx;
    const rangeStr = formatFormulaRange(drag.startR, drag.startC, rIdx, cIdx);
    onSetCellValue(drag.anchorR, drag.anchorC, `${drag.basePrefix}${rangeStr}`, false);
    return true;
  };

  const finishPointerDrag = () => {
    onEndNormalDrag();
    const drag = formulaDragRef.current;
    if (!drag) return;
    formulaDragRef.current = null;
    onFocusFormulaEditor(drag.anchorR, drag.anchorC);
  };

  const finishRef = useRef(finishPointerDrag);
  finishRef.current = finishPointerDrag;

  useEffect(() => {
    const onWindowMouseUp = () => finishRef.current();
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, []);

  return {
    formulaDragRef,
    justPickedRef,
    startFormulaDrag,
    updateFormulaDrag,
    finishPointerDrag,
    cancelFormulaDrag: () => { formulaDragRef.current = null; },
  };
}
