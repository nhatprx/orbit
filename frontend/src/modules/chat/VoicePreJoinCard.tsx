import { MonitorUp, PhoneCall, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { ChatChannelDto, VoiceParticipantDto } from '../../types/workspace.types';
import { initialsOf } from '../../utils/format';

interface VoicePreJoinCardProps {
  channel: ChatChannelDto;
  participants: VoiceParticipantDto[];
  activeOtherChannelName: string | null;
  joining: boolean;
  onJoin: () => void;
  onJoinAndShare: () => void;
}

export function VoicePreJoinCard({
  channel,
  participants,
  activeOtherChannelName,
  joining,
  onJoin,
  onJoinAndShare,
}: VoicePreJoinCardProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md border border-[#30363D] bg-[#161B22] p-6">
        <Volume2 className="mx-auto h-8 w-8 text-[#22C55E]" strokeWidth={1.5} />
        <h3 className="mt-3 text-lg font-semibold text-[#E6EDF3]">{channel.name}</h3>
        <p className="mt-1 text-xs text-[#8A8A8A]">
          {channel.description || 'Voice, video, and live screen sharing channel.'}
        </p>

        {activeOtherChannelName && (
          <p className="mt-3 border border-[#30363D] bg-[#0D1117] px-3 py-2 font-mono text-[11px] text-[#EAB308]">
            Currently in {activeOtherChannelName}. Joining switches your active voice call.
          </p>
        )}

        <div className="mt-4 border border-[#30363D] bg-[#0D1117] p-3 text-left">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">
            In this room ({participants.length})
          </p>
          {participants.length === 0 ? (
            <p className="mt-1.5 text-xs text-[#8A8A8A]">No one is connected yet.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {participants.map((p) => (
                <span
                  key={p.userId}
                  className="inline-flex items-center gap-1.5 border border-[#30363D] bg-[#161B22] px-2 py-1 text-xs text-[#E6EDF3]"
                >
                  <span className="font-mono text-[10px] text-[#22C55E]">
                    {initialsOf(p.displayName)}
                  </span>
                  {p.displayName}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="primary" disabled={joining} onClick={onJoin}>
            <PhoneCall className="h-4 w-4" strokeWidth={1.5} />
            {joining ? 'Connecting...' : 'Join Voice Channel'}
          </Button>
          <Button type="button" variant="secondary" disabled={joining} onClick={onJoinAndShare}>
            <MonitorUp className="h-4 w-4" strokeWidth={1.5} />
            Join &amp; Share Screen
          </Button>
        </div>
      </div>
    </div>
  );
}
