import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { errorMessage } from '../../services/workspace/httpClient';
import type { ChatChannelDto, ChatMessageDto } from '../../types/workspace.types';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { useChatChannel } from './useChatChannel';

interface VoiceSideChatProps {
  channel: ChatChannelDto;
  currentUserId: string | null;
  canManageChannels: boolean;
  onClose: () => void;
}

export function VoiceSideChat({
  channel,
  currentUserId,
  canManageChannels,
  onClose,
}: VoiceSideChatProps) {
  const chat = useChatChannel(channel.id);
  const [replyTo, setReplyTo] = useState<ChatMessageDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(messageId: string) {
    setDeleteError(null);
    try {
      await chat.deleteMessage(messageId);
      setReplyTo((prev) => (prev?.id === messageId ? null : prev));
    } catch (err) {
      setDeleteError(errorMessage(err, 'Could not delete message.'));
    }
  }

  return (
    <aside
      aria-label="Voice room text chat"
      className="flex w-80 shrink-0 flex-col border-l border-[#30363D] bg-[#0D1117]"
    >
      <div className="flex items-center justify-between border-b border-[#30363D] bg-[#161B22] px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E6EDF3]">
          <MessageSquare className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <span>Voice Chat</span>
        </div>
        <button
          type="button"
          aria-label="Close side chat"
          onClick={onClose}
          className="text-[#8A8A8A] hover:text-[#E6EDF3]"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {(chat.error || deleteError) && (
        <div className="p-2">
          <ErrorView message={deleteError ?? chat.error ?? 'Chat error.'} />
        </div>
      )}

      {chat.loading ? (
        <LoadingView label="Loading chat..." />
      ) : (
        <ChatMessageList
          messages={chat.messages}
          currentUserId={currentUserId}
          canManageChannels={canManageChannels}
          hasOlder={chat.hasOlder}
          loadingOlder={chat.loadingOlder}
          onLoadOlder={() => void chat.loadOlder()}
          onReply={(message) => setReplyTo(message)}
          onDeleteMessage={handleDelete}
        />
      )}

      <ChatComposer
        placeholder={`Message ${channel.name}`}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onSend={chat.send}
      />
    </aside>
  );
}
