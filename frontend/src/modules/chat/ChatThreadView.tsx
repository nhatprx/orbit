import { useState } from 'react';
import { Search, Users, X } from 'lucide-react';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { errorMessage } from '../../services/workspace/httpClient';
import type { ConnectionState } from '../../services/workspace/stomp/StompConnection';
import type { ChatChannelDto, ChatMessageDto } from '../../types/workspace.types';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { useChatChannel } from './useChatChannel';
import { ChatChannelIcon } from './ChatChannelIcon';
import { ChatTypingIndicator } from './ChatTypingIndicator';

interface ChatThreadViewProps {
  channel: ChatChannelDto;
  scopeLabel: string;
  connection: ConnectionState;
  currentUserId: string | null;
  canManageChannels: boolean;
  canWriteChat?: boolean;
  showMembers: boolean;
  onToggleMembers: () => void;
}

const STATE_LABEL: Record<ConnectionState, { text: string; color: string }> = {
  connected: { text: 'Live', color: 'bg-[#22C55E]' },
  connecting: { text: 'Connecting', color: 'bg-[#EAB308]' },
  reconnecting: { text: 'Reconnecting', color: 'bg-[#EAB308]' },
  idle: { text: 'Offline', color: 'bg-[#7D8590]' },
};

export function ChatThreadView({
  channel,
  scopeLabel,
  connection,
  currentUserId,
  canManageChannels,
  canWriteChat = true,
  showMembers,
  onToggleMembers,
}: ChatThreadViewProps) {
  const chat = useChatChannel(channel.id, currentUserId);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessageDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const state = STATE_LABEL[connection];
  const activeReplyTo =
    canWriteChat && replyTo && chat.messages.some((m) => m.id === replyTo.id) ? replyTo : null;

  async function handleDeleteMessage(messageId: string) {
    setActionError(null);
    try {
      await chat.deleteMessage(messageId);
      setReplyTo((prev) => (prev?.id === messageId ? null : prev));
    } catch (err) {
      setActionError(errorMessage(err, 'Could not delete message.'));
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[#0D1117]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-5 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-base font-semibold text-[#E6EDF3]">
            <ChatChannelIcon type={channel.channelType} className="h-4 w-4 shrink-0 text-[#22C55E]" />
            <span className="truncate">{channel.name}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-[#8A8A8A]">
            {channel.channelType === 'FORUM' ? 'Forum topics' : scopeLabel}{channel.description ? ` - ${channel.description}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A8A8A]"
              strokeWidth={1.5}
            />
            <input
              type="text"
              aria-label="Search messages"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search messages..."
              className="h-8 w-44 border border-[#30363D] bg-[#0D1117] pl-8 pr-7 text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear message search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#E6EDF3]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>

          <button
            type="button"
            aria-label="Toggle members panel"
            aria-pressed={showMembers}
            title="Toggle Members"
            onClick={onToggleMembers}
            className={`flex h-8 items-center gap-1.5 border px-2.5 text-xs font-medium transition-colors ${
              showMembers
                ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                : 'border-[#30363D] bg-[#21262D] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'
            }`}
          >
            <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
            Members
          </button>

          <span
            className="flex items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2 py-1 font-mono text-xs text-[#8A8A8A]"
            role="status"
          >
            <span className={`h-1.5 w-1.5 ${state.color}`} />
            {state.text}
          </span>
        </div>
      </header>

      {(chat.error || actionError) && (
        <div className="p-3">
          <ErrorView message={actionError ?? chat.error ?? 'Chat error.'} />
        </div>
      )}

      {chat.loading ? (
        <LoadingView label="Loading messages..." />
      ) : (
        <ChatMessageList
          messages={chat.messages}
          currentUserId={currentUserId}
          canManageChannels={canManageChannels}
          canWriteChat={canWriteChat}
          searchQuery={searchQuery}
          hasOlder={chat.hasOlder}
          loadingOlder={chat.loadingOlder}
          onLoadOlder={() => void chat.loadOlder()}
          onReply={(message) => setReplyTo(message)}
          onDeleteMessage={handleDeleteMessage}
        />
      )}

      <ChatTypingIndicator names={chat.typingUsers} />
      <ChatComposer
          placeholder={canWriteChat ? channel.channelType === 'FORUM' ? `Start a topic in ${channel.name}` : `Message #${channel.name}` : 'Read-only access'}
        disabled={!canWriteChat}
        readOnlyNotice={
          canWriteChat ? null : 'Read-only access: you do not have permission to send messages or reply.'
        }
        replyTo={activeReplyTo}
        onClearReply={() => setReplyTo(null)}
        onSend={chat.send}
        onTyping={chat.sendTyping}
      />
    </div>
  );
}
