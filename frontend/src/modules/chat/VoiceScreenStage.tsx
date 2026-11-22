import { useEffect, useRef, useState } from 'react';
import { Monitor, MonitorOff, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

export interface ActiveScreenShare {
  userId: string;
  presenterName: string;
  isLocal: boolean;
  stream: MediaStream | null;
}

interface VoiceScreenStageProps {
  shares: ActiveScreenShare[];
  activeShare: ActiveScreenShare;
  onSelectShare: (userId: string) => void;
  onStopLocalShare: () => void;
}

export function VoiceScreenStage({
  shares,
  activeShare,
  onSelectShare,
  onStopLocalShare,
}: VoiceScreenStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = activeShare.stream;
    return () => {
      el.srcObject = null;
    };
  }, [activeShare.stream]);

  return (
    <div
      aria-label="Screen share stage"
      className="group relative overflow-hidden border border-[#22C55E] bg-black"
    >
      <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 border border-[#22C55E] bg-[#052E16]/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#4ADE80]">
          <span className="h-1.5 w-1.5 bg-[#22C55E]" />
          LIVE SCREEN
        </span>
        <span className="border border-[#30363D] bg-[#0D1117]/85 px-2 py-0.5 text-[11px] font-medium text-[#E6EDF3]">
          {activeShare.presenterName}
          {activeShare.isLocal ? ' (You)' : ''}
        </span>
        {shares.length > 1 &&
          shares.map((item) => (
            <button
              key={item.userId}
              type="button"
              onClick={() => onSelectShare(item.userId)}
              className={`pointer-events-auto border px-2 py-0.5 font-mono text-[10px] ${
                item.userId === activeShare.userId
                  ? 'border-[#22C55E] bg-[#052E16]/90 text-[#4ADE80]'
                  : 'border-[#30363D] bg-[#0D1117]/85 text-[#BDBDBD] hover:text-[#E6EDF3]'
              }`}
            >
              {item.presenterName}
            </button>
          ))}
      </div>

      <div
        className={`absolute right-2.5 top-2.5 z-10 flex items-center gap-1.5 transition-opacity ${
          zoom > 1 ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
        }`}
      >
        <div className="flex items-center gap-0.5 border border-[#30363D] bg-[#0D1117]/90 px-1 py-0.5">
          <button
            type="button"
            aria-label="Zoom out screen share"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
            className="flex h-6 w-6 items-center justify-center text-[#BDBDBD] hover:text-[#4ADE80]"
          >
            <ZoomOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <span className="min-w-[36px] text-center font-mono text-[10px] text-[#E6EDF3]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in screen share"
            onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
            className="flex h-6 w-6 items-center justify-center text-[#BDBDBD] hover:text-[#4ADE80]"
          >
            <ZoomIn className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          {zoom > 1 && (
            <button
              type="button"
              aria-label="Reset screen share zoom"
              onClick={() => setZoom(1)}
              className="flex h-6 w-6 items-center justify-center text-[#BDBDBD] hover:text-[#4ADE80]"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {activeShare.isLocal && (
          <button
            type="button"
            onClick={onStopLocalShare}
            aria-label="Stop screen share"
            title="Stop Sharing"
            className="inline-flex h-7 items-center gap-1 border border-[#EF4444] bg-[#0D1117]/90 px-2 text-[11px] font-medium text-[#EF4444] hover:bg-[#EF4444] hover:text-[#0D1117]"
          >
            <MonitorOff className="h-3 w-3" strokeWidth={1.5} />
            Stop
          </button>
        )}
      </div>

      <div className="flex h-[60vh] min-h-[440px] max-h-[720px] items-center justify-center overflow-auto bg-black">
        {activeShare.stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={activeShare.isLocal}
            aria-label={`${activeShare.presenterName} shared screen`}
            style={zoom > 1 ? { transform: `scale(${zoom})`, transformOrigin: 'center center' } : undefined}
            className="h-full w-full object-contain transition-transform"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-[#8A8A8A]">
            <Monitor className="h-8 w-8 text-[#22C55E]" strokeWidth={1.5} />
            <p className="font-mono text-xs text-[#E6EDF3]">
              Screen share active for {activeShare.presenterName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
