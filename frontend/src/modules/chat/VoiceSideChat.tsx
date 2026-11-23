import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { errorMessage } from '../../services/workspace/httpClient';
import type { ChatChannelDto, ChatMessageDto, MemberDto } from '../../types/workspace.types';
import { ChatComposer } from './ChatComposer';
import { ChatImageLightbox, type PreviewImageItem } from './ChatImageLightbox';
import { ChatMessageList } from './ChatMessageList';
import { useChatChannel } from './useChatChannel';

interface VoiceSideChatProps {
  channel: ChatChannelDto;
  currentUserId: string | null;
  canManageChannels: boolean;
  canWriteChat?: boolean;
  mentionMembers?: MemberDto[];
  onClose: () => void;
}

export function VoiceSideChat({
  channel,
  currentUserId,
  canManageChannels,
  canWriteChat = true,
  mentionMembers = [],
  onClose,
}: VoiceSideChatProps) {
  const chat = useChatChannel(channel.id, currentUserId);
  const [replyTo, setReplyTo] = useState<ChatMessageDto | null>(null);
  const [previewImage, setPreviewImage] = useState<PreviewImageItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const activeReplyTo =
    canWriteChat && replyTo && chat.messages.some((m) => m.id === replyTo.id) ? replyTo : null;

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
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#30363D] bg-[#161B22] px-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E6EDF3]">
          <MessageSquare className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <span>Voice Chat</span>
        </div>
        <button
          type="button"
          aria-label="Close side chat"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8B949E] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3]"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
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
          canWriteChat={canWriteChat}
          hasOlder={chat.hasOlder}
          loadingOlder={chat.loadingOlder}
          onLoadOlder={() => void chat.loadOlder()}
          onReply={(message) => setReplyTo(message)}
          onDeleteMessage={handleDelete}
          onToggleReaction={chat.setReaction}
          onPreviewImage={setPreviewImage}
        />
      )}

      <ChatComposer
        channelId={channel.id}
        mentionMembers={mentionMembers}
        placeholder={canWriteChat ? `Message ${channel.name}` : 'Read-only access'}
        disabled={!canWriteChat}
        textOnly
        readOnlyNotice={canWriteChat ? null : 'Read-only access: you cannot send messages.'}
        replyTo={activeReplyTo}
        onClearReply={() => setReplyTo(null)}
        onSend={chat.send}
      />
      <ChatImageLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
    </aside>
  );
}
