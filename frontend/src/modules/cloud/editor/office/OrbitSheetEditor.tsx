import { useCallback, useRef } from 'react';
import { OrbitOfficeHeader, type OrbitOfficeHeaderProps } from './OrbitOfficeHeader';
import { UniverSheetCanvas, type UniverSheetCanvasHandle } from './UniverSheetCanvas';
import type { OfficeSheetContentDto } from './officeTypes';
import { columnLabel, toSheetCsv } from './sheetFormulas';
import type { SheetCursorPayload, SheetMutationPayload } from './useOfficeCollab';

export const colIndexToLabel = (c: number): string => columnLabel(c);

export function exportSheetCsv(sheetName: string, rawRows: string[][]): void {
  const safeName = sheetName.trim() || 'Sheet1';
  const url = URL.createObjectURL(new Blob([toSheetCsv(rawRows)], { type: 'text/csv;charset=utf-8' }));
  const anchor = Object.assign(document.createElement('a'), { href: url, download: `${safeName}.csv` });
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export interface OrbitSheetEditorProps {
  value: OfficeSheetContentDto;
  resetTick?: number;
  readOnly?: boolean;
  headerProps?: Omit<OrbitOfficeHeaderProps, 'menuBar' | 'onExportCsv'>;
  onChange: (next: OfficeSheetContentDto) => void;
  onLocalMutation?: (mutation: SheetMutationPayload) => void;
  onSelectionCursorChange?: (cursor: SheetCursorPayload) => void;
  onReady?: (handle: UniverSheetCanvasHandle) => void;
}

export function OrbitSheetEditor({
  value,
  resetTick = 0,
  readOnly = false,
  headerProps,
  onChange,
  onLocalMutation,
  onSelectionCursorChange,
  onReady,
}: OrbitSheetEditorProps) {
  const canvasRef = useRef<UniverSheetCanvasHandle | null>(null);

  const handleSave = useCallback((closeAfter: boolean) => {
    if (!headerProps) return;
    canvasRef.current?.flushNow();
    headerProps.onSave(closeAfter);
  }, [headerProps]);

  const handleExportCsv = useCallback(() => {
    const activeTab = canvasRef.current?.getActiveSheetTab() ?? value.sheets[0] ?? { name: 'Sheet1', rows: [['']] };
    exportSheetCsv(activeTab.name, activeTab.rows);
  }, [value.sheets]);

  return (
    <div
      aria-label="Orbit Sheets Univer workspace"
      data-testid="orbit-sheet-editor"
      className="flex h-full w-full flex-col rounded-none bg-[#0D1117]"
    >
      {headerProps && (
        <OrbitOfficeHeader
          {...headerProps}
          onSave={handleSave}
          onExportCsv={handleExportCsv}
        />
      )}
      <div className="min-h-0 flex-1 overflow-hidden">
        <UniverSheetCanvas
          key={resetTick}
          ref={canvasRef}
          initialValue={value}
          readOnly={readOnly}
          onChange={onChange}
          onLocalMutation={onLocalMutation}
          onSelectionCursorChange={onSelectionCursorChange}
          onReady={onReady}
        />
      </div>
    </div>
  );
}
