import { useEffect, useState } from 'react';
import { Download, ExternalLink, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

export interface PreviewImageItem {
  url: string;
  name: string;
}

interface ChatImageLightboxProps {
  image: PreviewImageItem | null;
  onClose: () => void;
}

export function ChatImageLightbox({ image, onClose }: ChatImageLightboxProps) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [image?.url]);

  useEffect(() => {
    if (!image) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Image preview: ${image.name}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black/85 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between gap-3 border border-[#30363D] bg-[#161B22] px-4 py-2.5"
      >
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#E6EDF3]">
          {image.name}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
            className="flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]"
          >
            <ZoomOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <span className="min-w-[44px] text-center font-mono text-[11px] text-[#8B949E]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
            className="flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]"
          >
            <ZoomIn className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Reset zoom"
            onClick={() => setZoom(1)}
            className="flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <a
            href={image.url}
            download={image.name}
            aria-label="Download image"
            className="flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
          <a
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open original image"
            className="flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
          <button
            type="button"
            aria-label="Close image preview"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#BDBDBD] hover:border-[#EF4444] hover:text-[#EF4444]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        <img
          src={image.url}
          alt={image.name}
          onClick={(e) => e.stopPropagation()}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="max-h-full max-w-full border border-[#30363D] bg-[#0D1117] object-contain transition-transform"
        />
      </div>
    </div>
  );
}
