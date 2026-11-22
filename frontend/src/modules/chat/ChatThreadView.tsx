import { useState } from 'react';
import { Users } from 'lucide-react';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { errorMessage } from '../../services/workspace/httpClient';
import type { ChatChannelDto, ChatMessageDto } from '../../types/workspace.types';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { useChatChannel } from './useChatChannel';
import { ChatChannelIcon } from './ChatChannelIcon';
import { ChatTypingIndicator } from './ChatTypingIndicator';

interface ChatThreadViewProps {
  channel: ChatChannelDto;
  scopeLabel: string;
  currentUserId: string | null;
  canManageChannels: boolean;
  canWriteChat?: boolean;
  onlineCount: number;
}

export function ChatThreadView({
  channel,
  scopeLabel,
  currentUserId,
  canManageChannels,
  canWriteChat = true,
  onlineCount,
}: ChatThreadViewProps) {
  const chat = useChatChannel(channel.id, currentUserId);
  const [replyTo, setReplyTo] = useState<ChatMessageDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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

        <span className="flex h-8 items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2.5 font-mono text-xs text-[#8A8A8A]" role="status" aria-label={`${onlineCount} people online`}>
          <Users className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <span className="text-[#22C55E]">{onlineCount}</span> online
        </span>
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
          hasOlder={chat.hasOlder}
          loadingOlder={chat.loadingOlder}
          onLoadOlder={() => void chat.loadOlder()}
          onReply={(message) => setReplyTo(message)}
          onDeleteMessage={handleDeleteMessage}
          onToggleReaction={chat.setReaction}
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
