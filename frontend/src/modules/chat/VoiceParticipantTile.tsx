import { useEffect, useRef } from 'react';
import { MicOff, Monitor, Video, VolumeX } from 'lucide-react';
import type { VoiceParticipantDto } from '../../types/workspace.types';
import { initialsOf } from '../../utils/format';

interface VoiceParticipantTileProps {
  participant: VoiceParticipantDto;
  isLocal: boolean;
  videoStream: MediaStream | null;
  isScreenSharing: boolean;
  compact?: boolean;
}

export function VoiceParticipantTile({
  participant,
  isLocal,
  videoStream,
  isScreenSharing,
  compact = false,
}: VoiceParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo = participant.cameraOn && videoStream !== null;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !showVideo) return;
    el.srcObject = videoStream;
    return () => {
      el.srcObject = null;
    };
  }, [videoStream, showVideo]);

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden border bg-[#161B22] ${
        compact ? 'min-h-[120px]' : 'min-h-[180px]'
      } ${participant.speaking ? 'border-[#22C55E]' : 'border-[#30363D]'}`}
    >
      <div className="relative flex flex-1 items-center justify-center bg-[#0D1117]">
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            aria-label={`${participant.displayName} camera feed`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={`flex items-center justify-center border font-mono font-semibold ${
              compact ? 'h-11 w-11 text-sm' : 'h-16 w-16 text-lg'
            } ${
              participant.speaking
                ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                : 'border-[#3B434B] bg-[#161B22] text-[#E6EDF3]'
            }`}
          >
            {initialsOf(participant.displayName)}
          </div>
        )}

        {participant.speaking && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 border border-[#22C55E] bg-[#052E16] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#4ADE80]">
            <span className="h-1.5 w-1.5 bg-[#22C55E]" />
            SPEAKING
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-[#30363D] bg-[#161B22] px-2.5 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[#E6EDF3]">
            {participant.displayName}
            {isLocal && <span className="ml-1 font-mono text-[10px] text-[#22C55E]">(You)</span>}
          </p>
          <p className="truncate font-mono text-[10px] text-[#8A8A8A]">@{participant.username}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {isScreenSharing && (
            <span className="inline-flex items-center gap-1 border border-[#22C55E] bg-[#052E16] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#4ADE80]">
              <Monitor className="h-3 w-3" strokeWidth={1.5} />
              SHARING
            </span>
          )}
          {participant.cameraOn && (
            <span className="inline-flex items-center gap-1 border border-[#22C55E] bg-[#052E16] px-1.5 py-0.5 font-mono text-[10px] text-[#4ADE80]">
              <Video className="h-3 w-3" strokeWidth={1.5} />
              CAM
            </span>
          )}
          {participant.muted && (
            <span className="inline-flex items-center gap-1 border border-[#EF4444] bg-[#21262D] px-1.5 py-0.5 font-mono text-[10px] text-[#EF4444]">
              <MicOff className="h-3 w-3" strokeWidth={1.5} />
              MUTED
            </span>
          )}
          {participant.deafened && (
            <span className="inline-flex items-center gap-1 border border-[#EF4444] bg-[#21262D] px-1.5 py-0.5 font-mono text-[10px] text-[#EF4444]">
              <VolumeX className="h-3 w-3" strokeWidth={1.5} />
              DEAFENED
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
