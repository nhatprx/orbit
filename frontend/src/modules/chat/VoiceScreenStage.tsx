import { useEffect, useRef } from 'react';
import { Monitor } from 'lucide-react';

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
}

export function VoiceScreenStage({
  shares,
  activeShare,
  onSelectShare,
}: VoiceScreenStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
      className={`relative overflow-hidden border border-[#22C55E] bg-black ${
        activeShare.stream ? 'inline-flex max-h-full max-w-full items-center justify-center' : 'flex h-full w-full items-center justify-center'
      }`}
    >
      {shares.length > 1 && (
        <div className="absolute left-2.5 top-2.5 z-10 flex flex-wrap items-center gap-1.5">
          {shares.map((item) => (
            <button
              key={item.userId}
              type="button"
              onClick={() => onSelectShare(item.userId)}
              className={`border px-2 py-0.5 font-mono text-[10px] ${
                item.userId === activeShare.userId
                  ? 'border-[#22C55E] bg-[#052E16]/90 text-[#4ADE80]'
                  : 'border-[#30363D] bg-[#0D1117]/85 text-[#BDBDBD] hover:text-[#E6EDF3]'
              }`}
            >
              {item.presenterName}
            </button>
          ))}
        </div>
      )}

      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
        {activeShare.stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={activeShare.isLocal}
            aria-label={`${activeShare.presenterName} shared screen`}
            className="block max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-[#8A8A8A]">
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
