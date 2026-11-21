import { MicOff, Monitor, Video, VolumeX } from 'lucide-react';
import type { VoiceParticipantDto } from '../../types/workspace.types';
import { initialsOf } from '../../utils/format';

interface VoiceChannelUsersProps {
  participants: VoiceParticipantDto[];
}

export function VoiceChannelUsers({ participants }: VoiceChannelUsersProps) {
  if (participants.length === 0) return null;

  return (
    <div className="ml-4 mt-1 space-y-1 border-l border-[#30363D] pl-2">
      {participants.map((p) => (
        <div key={p.userId} className="flex items-center justify-between gap-1.5 py-0.5 text-xs">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center border font-mono text-[10px] font-semibold ${
                p.speaking
                  ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                  : 'border-[#3B434B] bg-[#0D1117] text-[#BDBDBD]'
              }`}
            >
              {initialsOf(p.displayName)}
            </span>
            <span className={`truncate ${p.speaking ? 'font-medium text-[#4ADE80]' : 'text-[#BDBDBD]'}`}>
              {p.displayName}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {p.screenSharing && (
              <span className="inline-flex items-center gap-0.5 border border-[#22C55E] bg-[#052E16] px-1 font-mono text-[9px] font-semibold text-[#4ADE80]">
                <Monitor className="h-2.5 w-2.5" strokeWidth={1.5} />
                LIVE
              </span>
            )}
            {p.cameraOn && <Video className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />}
            {p.muted && <MicOff className="h-3 w-3 text-[#EF4444]" strokeWidth={1.5} />}
            {p.deafened && <VolumeX className="h-3 w-3 text-[#EF4444]" strokeWidth={1.5} />}
          </div>
        </div>
      ))}
    </div>
  );
}
