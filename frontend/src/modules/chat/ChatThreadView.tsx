import { useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { errorMessage } from '../../services/workspace/httpClient';
import type { ChatChannelDto, ChatMessageDto, MemberDto } from '../../types/workspace.types';
import { ChatComposer } from './ChatComposer';
import { ChatImageLightbox, type PreviewImageItem } from './ChatImageLightbox';
import { useChatFileDrop } from './useChatFileDrop';
import { ChatInfoSidebar } from './ChatInfoSidebar';
import { useChatLayout } from './chatLayoutStore';
import { ChatMessageList } from './ChatMessageList';
import { ChatPinnedBanner } from './ChatPinnedBanner';
import { ChatSelectionBar } from './ChatSelectionBar';
import { ChatThreadHeader } from './ChatThreadHeader';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { useChatChannel } from './useChatChannel';

interface ChatThreadViewProps {
  channel: ChatChannelDto;
  workspaceId?: string;
  projectId?: string | null;
  scopeLabel: string;
  currentUserId: string | null;
  canManageChannels: boolean;
  canWriteChat?: boolean;
  onlineCount: number;
  mentionMembers?: MemberDto[];
  onEditChannel?: (channel: ChatChannelDto) => void;
  onDeleteChannel?: (channel: ChatChannelDto) => void;
}

export function ChatThreadView({
  channel, workspaceId, projectId = null, scopeLabel, currentUserId, canManageChannels,
  canWriteChat = true, onlineCount, mentionMembers = [], onEditChannel, onDeleteChannel,
}: ChatThreadViewProps) {
  const chat = useChatChannel(channel.id, currentUserId);
  const [replyTo, setReplyTo] = useState<ChatMessageDto | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessageDto | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const { showRightSidebar: showInfo, setRightSidebar: setShowInfo } = useChatLayout();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<PreviewImageItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileDrop = useChatFileDrop(canWriteChat);

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
      <div className="relative flex min-w-0 flex-1 flex-col" {...fileDrop.dropHandlers}>
        {fileDrop.isDragOver && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed border-[#22C55E] bg-[#0D1117]/85">
            <div className="flex flex-col items-center gap-2 border border-[#22C55E] bg-[#161B22] px-6 py-4 text-center">
              <Upload className="h-6 w-6 text-[#22C55E]" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-[#E6EDF3]">Drop images, files, or folders</p>
              <p className="text-xs text-[#8B949E]">Files will be attached as a single message</p>
            </div>
          </div>
        )}
        <ChatThreadHeader
          channel={channel}
          scopeLabel={scopeLabel}
          members={mentionMembers}
          messages={chat.messages}
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
            channel={channel}
            scopeLabel={scopeLabel}
            messages={chat.messages}
            members={mentionMembers}
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
            workspaceId={workspaceId}
            projectId={projectId}
            mentionMembers={mentionMembers}
            placeholder={canWriteChat ? channel.channelType === 'FORUM' ? `Start a topic in ${channel.name}` : `Message #${channel.name}` : 'Read-only access'}
            disabled={!canWriteChat}
            readOnlyNotice={canWriteChat ? null : 'Read-only access: you do not have permission to send messages or reply.'}
            replyTo={activeReplyTo}
            editingMessage={activeEditing}
            droppedFiles={fileDrop.droppedFiles}
            onClearDroppedFiles={fileDrop.clearDroppedFiles}
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
          onlineCount={onlineCount}
          messages={chat.messages}
          pinnedMessages={pinnedMessages}
          canManageChannels={canManageChannels}
          canWriteChat={canWriteChat}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          onEditChannel={onEditChannel}
          onDeleteChannel={onDeleteChannel}
          onUnpin={handleTogglePin}
          onPreviewImage={setPreviewImage}
          onClose={() => setShowInfo(false)}
        />
      )}
      <ChatImageLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
