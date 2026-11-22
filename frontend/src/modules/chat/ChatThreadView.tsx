import { useMemo, useState } from 'react';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { errorMessage } from '../../services/workspace/httpClient';
import type { ChatChannelDto, ChatMessageDto, MemberDto } from '../../types/workspace.types';
import { ChatComposer } from './ChatComposer';
import { ChatImageLightbox, type PreviewImageItem } from './ChatImageLightbox';
import { ChatInfoSidebar } from './ChatInfoSidebar';
import { ChatMessageList } from './ChatMessageList';
import { ChatPinnedBanner } from './ChatPinnedBanner';
import { ChatSelectionBar } from './ChatSelectionBar';
import { ChatThreadHeader } from './ChatThreadHeader';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { useChatChannel } from './useChatChannel';

interface ChatThreadViewProps {
  channel: ChatChannelDto;
  scopeLabel: string;
  currentUserId: string | null;
  canManageChannels: boolean;
  canWriteChat?: boolean;
  onlineCount: number;
  mentionMembers?: MemberDto[];
  onEditChannel?: (channel: ChatChannelDto) => void;
}

export function ChatThreadView({
  channel, scopeLabel, currentUserId, canManageChannels,
  canWriteChat = true, mentionMembers = [], onEditChannel,
}: ChatThreadViewProps) {
  const chat = useChatChannel(channel.id, currentUserId);
  const [replyTo, setReplyTo] = useState<ChatMessageDto | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessageDto | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [showInfo, setShowInfo] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<PreviewImageItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectionMode = selectedIds.size > 0;
  const activeReplyTo = canWriteChat && replyTo && chat.messages.some((m) => m.id === replyTo.id) ? replyTo : null;
  const activeEditing = canWriteChat && editingMessage && chat.messages.some((m) => m.id === editingMessage.id) ? editingMessage : null;

  const pinnedMessages = useMemo(
    () => chat.messages.filter((m) => m.pinned).sort((a, b) => (b.pinnedAt ?? b.createdAt).localeCompare(a.pinnedAt ?? a.createdAt)),
    [chat.messages]
  );
  const selectedMessages = useMemo(() => chat.messages.filter((m) => selectedIds.has(m.id)), [chat.messages, selectedIds]);
  const deletableSelected = useMemo(
    () => selectedMessages.filter((m) => m.senderId === currentUserId || canManageChannels),
    [selectedMessages, currentUserId, canManageChannels]
  );

  function toggleSelect(messageId: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(messageId)) next.delete(messageId); else next.add(messageId); return next; });
  }

  async function handleDeleteMessage(messageId: string) {
    setActionError(null);
    try {
      await chat.deleteMessage(messageId);
      setReplyTo((prev) => (prev?.id === messageId ? null : prev));
      setEditingMessage((prev) => (prev?.id === messageId ? null : prev));
    } catch (err) { setActionError(errorMessage(err, 'Could not delete message.')); }
  }

  async function handleTogglePin(messageId: string) {
    setActionError(null);
    try { await chat.togglePin(messageId); }
    catch (err) { setActionError(errorMessage(err, 'Could not update pin state.')); }
  }

  async function handleCopySelected() {
    const text = selectedMessages.map((m) => `${m.senderName}: ${m.content || m.attachmentName || 'Image'}`).join('\n');
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  }

  async function handleDeleteSelected() {
    setActionError(null);
    for (const msg of deletableSelected) {
      try { await chat.deleteMessage(msg.id); }
      catch (err) { setActionError(errorMessage(err, 'Could not delete some selected messages.')); }
    }
    setSelectedIds(new Set());
  }

  return (
    <div className="flex min-w-0 flex-1 bg-[#0D1117]">
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatThreadHeader
          channel={channel}
          scopeLabel={scopeLabel}
          members={mentionMembers}
          messages={chat.messages}
          showInfo={showInfo}
          onToggleInfo={() => setShowInfo((v) => !v)}
          onOpenInfo={() => setShowInfo(true)}
        />

        <ChatPinnedBanner pinnedMessages={pinnedMessages} canWriteChat={canWriteChat} onUnpin={handleTogglePin} />

        {(chat.error || actionError) && (
          <div className="p-3"><ErrorView message={actionError ?? chat.error ?? 'Chat error.'} /></div>
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
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onStartSelect={(id) => setSelectedIds(new Set([id]))}
            onLoadOlder={() => void chat.loadOlder()}
            onReply={(message) => { setEditingMessage(null); setReplyTo(message); }}
            onEdit={(message) => { setReplyTo(null); setEditingMessage(message); }}
            onTogglePin={handleTogglePin}
            onDeleteMessage={handleDeleteMessage}
            onToggleReaction={chat.setReaction}
            onPreviewImage={setPreviewImage}
          />
        )}

        <ChatTypingIndicator names={chat.typingUsers} />
        {selectionMode ? (
          <ChatSelectionBar selectedCount={selectedMessages.length} deletableCount={deletableSelected.length} onCopySelected={handleCopySelected} onDeleteSelected={handleDeleteSelected} onCancel={() => setSelectedIds(new Set())} />
        ) : (
          <ChatComposer
            channelId={channel.id}
            mentionMembers={mentionMembers}
            placeholder={canWriteChat ? channel.channelType === 'FORUM' ? `Start a topic in ${channel.name}` : `Message #${channel.name}` : 'Read-only access'}
            disabled={!canWriteChat}
            readOnlyNotice={canWriteChat ? null : 'Read-only access: you do not have permission to send messages or reply.'}
            replyTo={activeReplyTo}
            editingMessage={activeEditing}
            onClearReply={() => setReplyTo(null)}
            onCancelEdit={() => setEditingMessage(null)}
            onSaveEdit={chat.editMessage}
            onSend={chat.send}
            onTyping={chat.sendTyping}
          />
        )}
      </div>

      {showInfo && (
        <ChatInfoSidebar
          channel={channel}
          scopeLabel={scopeLabel}
          members={mentionMembers}
          messages={chat.messages}
          pinnedMessages={pinnedMessages}
          canManageChannels={canManageChannels}
          canWriteChat={canWriteChat}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          onEditChannel={onEditChannel}
          onUnpin={handleTogglePin}
          onPreviewImage={setPreviewImage}
          onClose={() => setShowInfo(false)}
        />
      )}
      <ChatImageLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
