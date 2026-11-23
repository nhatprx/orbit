import { useEffect, useRef } from 'react';
import type { VoiceParticipantDto } from '../../types/workspace.types';
import { initialsOf } from '../../utils/format';

interface VoiceParticipantTileProps {
  participant: VoiceParticipantDto;
  isLocal: boolean;
  videoStream: MediaStream | null;
  isScreenSharing?: boolean;
  compact?: boolean;
  solo?: boolean;
}

export function VoiceParticipantTile({
  participant,
  isLocal,
  videoStream,
  compact = false,
  solo = false,
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
      className={`relative flex h-full min-h-0 flex-col justify-between overflow-hidden border bg-[#161B22] ${
        compact ? 'min-h-[120px]' : 'min-h-[180px]'
      } ${participant.speaking ? 'border-[#22C55E]' : 'border-[#30363D]'}`}
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0D1117]">
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
          <>
            {participant.avatarUrl ? (
              <>
                <img
                  src={participant.avatarUrl}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl"
                />
                <div className="pointer-events-none absolute inset-0 bg-[#0D1117]/45 backdrop-blur-sm" />
              </>
            ) : (
              <div className="pointer-events-none absolute inset-0 bg-[#052E16]/20 backdrop-blur-md" />
            )}
            <div
              className={`relative z-10 flex items-center justify-center overflow-hidden border font-mono font-semibold ${
                compact ? 'h-11 w-11 text-sm' : solo ? 'h-24 w-24 text-2xl' : 'h-16 w-16 text-lg'
              } ${
                participant.speaking
                  ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                  : 'border-[#3B434B] bg-[#161B22] text-[#E6EDF3]'
              }`}
            >
              {participant.avatarUrl ? (
                <img
                  src={participant.avatarUrl}
                  alt={participant.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initialsOf(participant.displayName)
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center border-t border-[#30363D] bg-[#161B22] px-2.5 py-2">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-[#E6EDF3]">
          {participant.displayName}
        </p>
      </div>
    </div>
  );
}
