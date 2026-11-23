import { useEffect, useState, type ReactNode } from 'react';
import { Headphones, MessageSquare, Mic, MicOff, MonitorOff, MonitorUp, PhoneOff, Video, VideoOff, VolumeX } from 'lucide-react';
import { useChatLayout } from './chatLayoutStore';
import type { VoiceSessionState } from './chatVoiceTypes';

interface ChatVoiceControlBarProps {
  voice: VoiceSessionState;
  onOpenStage: (channelId: string) => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor(seconds / 60);
  const minutes = String(hours > 0 ? mins % 60 : mins).padStart(2, '0');
  const remainder = String(seconds % 60).padStart(2, '0');
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${minutes}:${remainder}` : `${minutes}:${remainder}`;
}

interface VoiceControlProps {
  label: string;
  active: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function VoiceControl({ label, active, danger = false, onClick, children }: VoiceControlProps) {
  const tone = danger ? 'border-[#EF4444] text-[#EF4444]' : active ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : 'border-[#30363D] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]';
  return <button type="button" aria-label={label} aria-pressed={active} title={label} onClick={onClick}
    className={`flex h-8 items-center justify-center border bg-[#161B22] transition-colors ${tone}`}>{children}</button>;
}

export function ChatVoiceControlBar({ voice, onOpenStage }: ChatVoiceControlBarProps) {
  const [elapsed, setElapsed] = useState(0);
  const { showVoiceChat, toggleVoiceChat } = useChatLayout();
  useEffect(() => {
    const connectedAt = voice.connectedAt;
    if (!voice.activeChannelId || connectedAt === null) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - connectedAt) / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [voice.activeChannelId, voice.connectedAt]);
  if (!voice.activeChannelId) return null;
  const id = voice.activeChannelId;

  return <section aria-label="Voice connection controls" className="border-t border-[#22C55E] bg-[#0D1117] px-3 py-2">
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 bg-[#22C55E]" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold tracking-wide text-[#22C55E]">VOICE CONNECTED</p>
          <button type="button" onClick={() => onOpenStage(id)} className="block max-w-40 truncate text-left text-xs text-[#E6EDF3] hover:text-[#4ADE80]">
            {voice.activeChannel?.name ?? 'Voice Channel'}
          </button>
        </div>
      </div>
      <span className="shrink-0 font-mono text-[10px] text-[#8A8A8A]">{formatDuration(elapsed)}</span>
    </div>
    <div className="mt-2 grid grid-cols-6 gap-1">
      <VoiceControl label={voice.muted ? 'Unmute microphone' : 'Mute microphone'} active={voice.muted} onClick={() => void voice.toggleMute()}>
        {voice.muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      </VoiceControl>
      <VoiceControl label={voice.deafened ? 'Undeafen audio' : 'Deafen audio'} active={voice.deafened} onClick={() => void voice.toggleDeafen()}>
        {voice.deafened ? <VolumeX className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
      </VoiceControl>
      <VoiceControl label={voice.cameraOn ? 'Turn camera off' : 'Turn camera on'} active={voice.cameraOn} onClick={() => void voice.toggleCamera()}>
        {voice.cameraOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
      </VoiceControl>
      <VoiceControl label={voice.screenSharing ? 'Stop screen share' : 'Share screen'} active={voice.screenSharing} onClick={() => void voice.toggleScreenShare()}>
        {voice.screenSharing ? <MonitorOff className="h-3.5 w-3.5" /> : <MonitorUp className="h-3.5 w-3.5" />}
      </VoiceControl>
      <VoiceControl
        label="Toggle voice text chat"
        active={showVoiceChat}
        onClick={() => {
          onOpenStage(id);
          toggleVoiceChat();
        }}
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </VoiceControl>
      <VoiceControl label="Disconnect voice" active={false} danger onClick={() => void voice.leaveChannel()}>
        <PhoneOff className="h-3.5 w-3.5" />
      </VoiceControl>
    </div>
  </section>;
}
