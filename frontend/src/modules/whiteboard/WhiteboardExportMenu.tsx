import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface WhiteboardExportMenuProps {
  disabled: boolean;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
}

export function WhiteboardExportMenu({
  disabled,
  onExportPng,
  onExportSvg,
  onExportJson,
}: WhiteboardExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1 text-xs"
        aria-expanded={open}
      >
        <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-44 border border-[#3B434B] bg-[#161B22] py-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportPng();
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-[#E6EDF3] hover:bg-[#21262D] hover:text-[#22C55E]"
          >
            Export as PNG
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportSvg();
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-[#E6EDF3] hover:bg-[#21262D] hover:text-[#22C55E]"
          >
            Export as SVG
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportJson();
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-[#E6EDF3] hover:bg-[#21262D] hover:text-[#22C55E]"
          >
            Export .excalidraw
          </button>
        </div>
      )}
    </div>
  );
}
