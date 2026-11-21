import { useCallback, useMemo, useRef } from 'react';
import { OrbitOfficeHeader, type OrbitOfficeHeaderProps } from './OrbitOfficeHeader';
import { UniverDocCanvas, type UniverDocCanvasHandle } from './UniverDocCanvas';
import { computeDocStats, stripHtmlTags } from './docHtmlCodec';
import type { OfficeDocContentDto } from './officeTypes';

export interface OrbitDocEditorProps {
  value: OfficeDocContentDto;
  readOnly?: boolean;
  headerProps?: Omit<OrbitOfficeHeaderProps, 'menuBar' | 'onExportCsv'>;
  onChange: (next: OfficeDocContentDto) => void;
  onReady?: (handle: UniverDocCanvasHandle) => void;
}

export function OrbitDocEditor({
  value,
  readOnly = false,
  headerProps,
  onChange,
  onReady,
}: OrbitDocEditorProps) {
  const canvasRef = useRef<UniverDocCanvasHandle | null>(null);
  const stats = useMemo(() => computeDocStats(value), [value]);

  const handleSave = useCallback((closeAfter: boolean) => {
    if (!headerProps) return;
    canvasRef.current?.flushNow();
    headerProps.onSave(closeAfter);
  }, [headerProps]);

  return (
    <div
      aria-label="Orbit Docs Univer workspace"
      data-testid="orbit-doc-editor"
      className="flex h-full w-full flex-col rounded-none bg-[#0D1117]"
    >
      {headerProps && (
        <OrbitOfficeHeader
          {...headerProps}
          onSave={handleSave}
        />
      )}
      <div className="sr-only" aria-label="Document accessible content">
        {value.blocks.map((block, idx) => (
          <p key={idx}>{stripHtmlTags(block.text)}</p>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <UniverDocCanvas
          ref={canvasRef}
          initialValue={value}
          readOnly={readOnly}
          onChange={onChange}
          onReady={onReady}
        />
      </div>
      <footer
        aria-label="Document status footer"
        className="flex items-center justify-between border-t border-[#30363D] bg-[#161B22] px-4 py-1.5 font-mono text-[11px] text-[#8B949E]"
      >
        <div className="flex items-center gap-4">
          <span>Words: {stats.words}</span>
          <span>Characters: {stats.chars}</span>
          <span>Paragraphs: {stats.paragraphs}</span>
          <span>Tables: {stats.tables}</span>
        </div>
        <span className="text-[#22C55E]">UNIVER DOCS ENGINE</span>
      </footer>
    </div>
  );
}
