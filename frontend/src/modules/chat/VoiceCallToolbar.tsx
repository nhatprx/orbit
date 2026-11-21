import {
  Headphones,
  MessageSquare,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
  VolumeX,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { VoiceSessionState } from './chatVoiceTypes';

interface VoiceCallToolbarProps {
  voice: VoiceSessionState;
  showSideChat: boolean;
  onToggleSideChat: () => void;
}

export function VoiceCallToolbar({
  voice,
  showSideChat,
  onToggleSideChat,
}: VoiceCallToolbarProps) {
  return (
    <div
      aria-label="Voice call controls"
      className="flex flex-wrap items-center justify-center gap-2 border-t border-[#30363D] bg-[#161B22] px-4 py-3"
    >
      <Button
        type="button"
        variant="secondary"
        aria-pressed={voice.muted}
        onClick={() => void voice.toggleMute()}
        className={voice.muted ? 'border-[#EF4444] text-[#EF4444]' : ''}
      >
        {voice.muted ? <MicOff className="h-4 w-4" strokeWidth={1.5} /> : <Mic className="h-4 w-4" strokeWidth={1.5} />}
        {voice.muted ? 'Unmute' : 'Mute'}
      </Button>

      <Button
        type="button"
        variant="secondary"
        aria-pressed={voice.deafened}
        onClick={() => void voice.toggleDeafen()}
        className={voice.deafened ? 'border-[#EF4444] text-[#EF4444]' : ''}
      >
        {voice.deafened ? (
          <VolumeX className="h-4 w-4" strokeWidth={1.5} />
        ) : (
          <Headphones className="h-4 w-4" strokeWidth={1.5} />
        )}
        {voice.deafened ? 'Undeafen' : 'Deafen'}
      </Button>

      <Button
        type="button"
        variant="secondary"
        aria-pressed={voice.cameraOn}
        onClick={() => void voice.toggleCamera()}
        className={voice.cameraOn ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : ''}
      >
        {voice.cameraOn ? (
          <Video className="h-4 w-4" strokeWidth={1.5} />
        ) : (
          <VideoOff className="h-4 w-4" strokeWidth={1.5} />
        )}
        {voice.cameraOn ? 'Camera Off' : 'Camera On'}
      </Button>

      <Button
        type="button"
        variant="secondary"
        aria-pressed={voice.screenSharing}
        onClick={() => void voice.toggleScreenShare()}
        className={voice.screenSharing ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : ''}
      >
        {voice.screenSharing ? (
          <MonitorOff className="h-4 w-4" strokeWidth={1.5} />
        ) : (
          <MonitorUp className="h-4 w-4" strokeWidth={1.5} />
        )}
        {voice.screenSharing ? 'Stop Sharing' : 'Share Screen'}
      </Button>

      <Button
        type="button"
        variant="secondary"
        aria-pressed={showSideChat}
        onClick={onToggleSideChat}
        className={showSideChat ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : ''}
      >
        <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
        Side Chat
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={() => void voice.leaveChannel()}
        className="border-[#EF4444] bg-[#EF4444] text-[#0D1117] hover:border-[#EF4444] hover:bg-[#0D1117] hover:text-[#EF4444]"
      >
        <PhoneOff className="h-4 w-4" strokeWidth={1.5} />
        Disconnect
      </Button>
    </div>
  );
}
