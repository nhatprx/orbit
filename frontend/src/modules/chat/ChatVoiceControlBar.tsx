import { useEffect, useState } from 'react';
import {
  Headphones,
  Maximize2,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
  VolumeX,
} from 'lucide-react';
import type { VoiceSessionState } from './chatVoiceTypes';

interface ChatVoiceControlBarProps {
  voice: VoiceSessionState;
  onOpenStage: (channelId: string) => void;
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function ChatVoiceControlBar({ voice, onOpenStage }: ChatVoiceControlBarProps) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!voice.activeChannelId || !voice.connectedAt) {
      setElapsedSec(0);
      return;
    }
    const connectedAt = voice.connectedAt;
    const sync = () => setElapsedSec(Math.floor((Date.now() - connectedAt) / 1000));
    sync();
    const timer = window.setInterval(sync, 1000);
    return () => window.clearInterval(timer);
  }, [voice.activeChannelId, voice.connectedAt]);

  if (!voice.activeChannelId) return null;

  const channelId = voice.activeChannelId;
  const channelName = voice.activeChannel?.name ?? 'Voice Channel';

  return (
    <div
      aria-label="Voice connection controls"
      className="border-t border-[#22C55E] bg-[#0D1117] px-3 py-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 bg-[#22C55E]" />
          <span className="truncate font-mono text-[11px] font-semibold tracking-wide text-[#22C55E]">
            VOICE CONNECTED
          </span>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-[#8A8A8A]">
          {formatDuration(elapsedSec)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenStage(channelId)}
          className="min-w-0 flex-1 truncate text-left text-xs font-medium text-[#E6EDF3] hover:text-[#4ADE80]"
          title={`Return to ${channelName}`}
        >
          {channelName}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Open voice stage"
            title="Open Voice Stage"
            onClick={() => onOpenStage(channelId)}
            className="border border-[#30363D] bg-[#161B22] p-1 text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#22C55E]"
          >
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Disconnect voice"
            title="Disconnect"
            onClick={() => void voice.leaveChannel()}
            className="border border-[#EF4444] bg-[#161B22] p-1 text-[#EF4444] hover:bg-[#EF4444] hover:text-[#0D1117]"
          >
            <PhoneOff className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1">
        <button
          type="button"
          aria-label={voice.muted ? 'Unmute microphone' : 'Mute microphone'}
          aria-pressed={voice.muted}
          title={voice.muted ? 'Unmute' : 'Mute'}
          onClick={() => void voice.toggleMute()}
          className={`flex items-center justify-center border py-1.5 transition-colors ${
            voice.muted
              ? 'border-[#EF4444] bg-[#21262D] text-[#EF4444]'
              : 'border-[#30363D] bg-[#161B22] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'
          }`}
        >
          {voice.muted ? <MicOff className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Mic className="h-3.5 w-3.5" strokeWidth={1.5} />}
        </button>

        <button
          type="button"
          aria-label={voice.deafened ? 'Undeafen audio' : 'Deafen audio'}
          aria-pressed={voice.deafened}
          title={voice.deafened ? 'Undeafen' : 'Deafen'}
          onClick={() => void voice.toggleDeafen()}
          className={`flex items-center justify-center border py-1.5 transition-colors ${
            voice.deafened
              ? 'border-[#EF4444] bg-[#21262D] text-[#EF4444]'
              : 'border-[#30363D] bg-[#161B22] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'
          }`}
        >
          {voice.deafened ? <VolumeX className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Headphones className="h-3.5 w-3.5" strokeWidth={1.5} />}
        </button>

        <button
          type="button"
          aria-label={voice.cameraOn ? 'Turn camera off' : 'Turn camera on'}
          aria-pressed={voice.cameraOn}
          title={voice.cameraOn ? 'Camera Off' : 'Camera On'}
          onClick={() => void voice.toggleCamera()}
          className={`flex items-center justify-center border py-1.5 transition-colors ${
            voice.cameraOn
              ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
              : 'border-[#30363D] bg-[#161B22] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'
          }`}
        >
          {voice.cameraOn ? <Video className="h-3.5 w-3.5" strokeWidth={1.5} /> : <VideoOff className="h-3.5 w-3.5" strokeWidth={1.5} />}
        </button>

        <button
          type="button"
          aria-label={voice.screenSharing ? 'Stop screen share' : 'Share screen'}
          aria-pressed={voice.screenSharing}
          title={voice.screenSharing ? 'Stop Sharing' : 'Share Screen'}
          onClick={() => void voice.toggleScreenShare()}
          className={`flex items-center justify-center border py-1.5 transition-colors ${
            voice.screenSharing
              ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
              : 'border-[#30363D] bg-[#161B22] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'
          }`}
        >
          {voice.screenSharing ? (
            <MonitorOff className="h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <MonitorUp className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  );
}
