import { useEffect, useRef } from 'react';
import { Maximize2, Monitor, MonitorOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';

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
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = activeShare.stream;
    return () => {
      el.srcObject = null;
    };
  }, [activeShare.stream]);

  function handleFullscreen() {
    const el = stageRef.current;
    if (el && typeof el.requestFullscreen === 'function') {
      void el.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div
      ref={stageRef}
      aria-label="Screen share stage"
      className="flex flex-col border border-[#22C55E] bg-[#0D1117]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] bg-[#161B22] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 border border-[#22C55E] bg-[#052E16] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#4ADE80]">
            <span className="h-1.5 w-1.5 bg-[#22C55E]" />
            LIVE SCREEN
          </span>
          <span className="truncate text-xs font-semibold text-[#E6EDF3]">
            {activeShare.presenterName}
            {activeShare.isLocal ? ' (You)' : ''}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {shares.length > 1 &&
            shares.map((item) => (
              <button
                key={item.userId}
                type="button"
                onClick={() => onSelectShare(item.userId)}
                className={`border px-2 py-1 font-mono text-[11px] ${
                  item.userId === activeShare.userId
                    ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                    : 'border-[#30363D] bg-[#21262D] text-[#BDBDBD] hover:text-[#E6EDF3]'
                }`}
              >
                {item.presenterName}
              </button>
            ))}

          <Button type="button" variant="secondary" onClick={handleFullscreen} aria-label="Fullscreen screen share">
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Fullscreen
          </Button>

          {activeShare.isLocal && (
            <Button
              type="button"
              variant="secondary"
              onClick={onStopLocalShare}
              className="border-[#EF4444] text-[#EF4444] hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-[#0D1117]"
            >
              <MonitorOff className="h-3.5 w-3.5" strokeWidth={1.5} />
              Stop Sharing
            </Button>
          )}
        </div>
      </div>

      <div className="flex h-[320px] items-center justify-center bg-black">
        {activeShare.stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={activeShare.isLocal}
            aria-label={`${activeShare.presenterName} shared screen`}
            className="h-full w-full object-contain"
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
