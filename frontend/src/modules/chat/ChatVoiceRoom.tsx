import { useState } from 'react';
import { AlertTriangle, MessageSquare, Users, Volume2, X } from 'lucide-react';
import type { ChatChannelDto, MemberDto } from '../../types/workspace.types';
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
  onlineCount: number;
  mentionMembers?: MemberDto[];
}

export function ChatVoiceRoom({
  channel,
  voice,
  currentUserId,
  canManageChannels,
  canWriteChat = true,
  onlineCount,
  mentionMembers = [],
}: ChatVoiceRoomProps) {
  const [showSideChat, setShowSideChat] = useState(false);
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
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-base font-semibold text-[#E6EDF3]">
              <Volume2 className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
              <span className="truncate">{channel.name}</span>
              <span className="border border-[#30363D] bg-[#21262D] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#BDBDBD]">
                {participants.length} in call
              </span>
            </div>
            {channel.description && (
              <p className="mt-0.5 truncate text-xs text-[#8A8A8A]">{channel.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Toggle voice text chat"
              aria-pressed={showSideChat}
              onClick={() => setShowSideChat((prev) => !prev)}
              className={`flex h-8 items-center gap-1.5 border px-2.5 text-xs font-medium ${
                showSideChat
                  ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                  : 'border-[#30363D] bg-[#21262D] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
              Chat
            </button>

            <span className="flex h-8 items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2.5 font-mono text-xs text-[#8A8A8A]" role="status" aria-label={`${onlineCount} people online`}>
              <Users className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
              <span className="text-[#22C55E]">{onlineCount}</span> online
            </span>
          </div>
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
            showSideChat={showSideChat}
            onToggleSideChat={() => setShowSideChat((prev) => !prev)}
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
          onClose={() => setShowSideChat(false)}
        />
      )}
    </div>
  );
}
