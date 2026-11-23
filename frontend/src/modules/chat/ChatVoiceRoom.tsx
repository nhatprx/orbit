import { AlertTriangle, Volume2, X } from 'lucide-react';
import type { ChatChannelDto, MemberDto } from '../../types/workspace.types';
import { useChatLayout } from './chatLayoutStore';
import type { VoiceSessionState } from './chatVoiceTypes';
import { VoicePreJoinCard } from './VoicePreJoinCard';
import { VoiceSideChat } from './VoiceSideChat';
import { VoiceStageBody } from './VoiceStageBody';

interface ChatVoiceRoomProps {
  channel: ChatChannelDto;
  voice: VoiceSessionState;
  currentUserId: string | null;
  canManageChannels: boolean;
  canWriteChat?: boolean;
  onlineCount?: number;
  mentionMembers?: MemberDto[];
}

export function ChatVoiceRoom({
  channel,
  voice,
  currentUserId,
  canManageChannels,
  canWriteChat = true,
  mentionMembers = [],
}: ChatVoiceRoomProps) {
  const { showVoiceChat: showSideChat, setVoiceChat } = useChatLayout();
  const isJoined = voice.activeChannelId === channel.id;
  const participants = voice.participantsByChannel[channel.id] ?? [];

  async function handleJoinAndShare() {
    if (!canWriteChat) return;
    await voice.joinChannel(channel.id);
    await voice.toggleScreenShare();
  }

  return (
    <div className="flex min-w-0 flex-1 bg-[#0D1117]">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#30363D] bg-[#161B22] px-4">
          <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
          <span className="truncate text-sm font-semibold text-[#E6EDF3]">{channel.name}</span>
        </header>

        {voice.mediaNotice && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 border-b border-[#EAB308] bg-[#161B22] px-4 py-2 text-xs text-[#EAB308]"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              <span>{voice.mediaNotice}</span>
            </div>
            <button
              type="button"
              aria-label="Dismiss media notice"
              onClick={voice.clearNotice}
              className="text-[#EAB308] hover:text-[#E6EDF3]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {!isJoined ? (
          <VoicePreJoinCard
            channel={channel}
            participants={participants}
            activeOtherChannelName={
              voice.activeChannel && voice.activeChannelId !== channel.id ? voice.activeChannel.name : null
            }
            joining={voice.joining}
            canWriteChat={canWriteChat}
            onJoin={() => void voice.joinChannel(channel.id)}
            onJoinAndShare={() => void handleJoinAndShare()}
          />
        ) : (
          <VoiceStageBody
            participants={participants}
            voice={voice}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {showSideChat && (
        <VoiceSideChat
          channel={channel}
          currentUserId={currentUserId}
          canManageChannels={canManageChannels}
          canWriteChat={canWriteChat}
          mentionMembers={mentionMembers}
          onClose={() => setVoiceChat(false)}
        />
      )}
    </div>
  );
}
