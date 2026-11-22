import { Ban, CheckSquare, CornerUpLeft, Pin, Square } from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import type { ChatMessageDto, ChatReactionKey } from '../../types/workspace.types';
import { formatTime } from '../../utils/format';
import { ChatMessageActions } from './ChatMessageActions';
import type { PreviewImageItem } from './ChatImageLightbox';
import { ChatMessageAttachment, isImageAttachment, resolveMessageAttachments } from './ChatMessageAttachment';
import { ChatMessageReadReceipt } from './ChatMessageReadReceipt';
import { ChatReactionDock } from './ChatReactionDock';

interface ChatMessageRowProps {
  message: ChatMessageDto;
  mine: boolean;
  canDelete: boolean;
  canWriteChat: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showReadReceipt?: boolean;
  seenByNames?: string[];
  selectionMode?: boolean;
  selected?: boolean;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  onToggleSelect?: (messageId: string) => void;
  onReply: (message: ChatMessageDto) => void;
  onEdit?: (message: ChatMessageDto) => void;
  onTogglePin?: (messageId: string) => Promise<void>;
  onStartSelect?: (messageId: string) => void;
  onDelete: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, key: ChatReactionKey) => Promise<void>;
  onPreviewImage?: (image: PreviewImageItem) => void;
}

const MENTION_SPLIT = /(@[A-Za-z0-9_.-]{1,64})/g;

function renderContent(text: string) {
  return text.split(MENTION_SPLIT).map((part, idx) => {
    if (!part.startsWith('@') || part.length <= 1) return part;
    const isAll = part.toLowerCase() === '@all';
    return (
      <span
        key={idx}
        className={isAll ? 'border border-[#1E5631] bg-[#052E16] px-1 font-semibold text-[#4ADE80]' : 'font-medium text-[#4ADE80]'}
      >
        {part}
      </span>
    );
  });
}

export function ChatMessageRow({
  message, mine, canDelete, canWriteChat,
  isFirstInGroup = true, isLastInGroup = true, showReadReceipt = false, seenByNames = [],
  selectionMode = false, selected = false, menuOpen, onMenuOpenChange, onToggleSelect,
  onReply, onEdit, onTogglePin, onStartSelect, onDelete, onToggleReaction, onPreviewImage,
}: ChatMessageRowProps) {
  const isDeleted = Boolean(message.deletedAt);
  const hasReply = !isDeleted && Boolean(message.replyToSenderName || message.replyToSnippet);
  const reactions = isDeleted ? [] : (message.reactions ?? []);
  const hasText = !isDeleted && message.content.trim().length > 0;
  const resolvedAtts = isDeleted ? [] : resolveMessageAttachments(message.attachments, message.attachmentName, message.attachmentUrl);
  const isImageOnly =
    !isDeleted && !hasText && !hasReply && !message.pinned &&
    resolvedAtts.length > 0 && resolvedAtts.every((a) => isImageAttachment(a.name, a.url));

  const bubbleClass = isImageOnly
    ? 'border-0 bg-transparent p-0 text-[#E6EDF3]'
    : isDeleted
      ? 'border border-dashed border-[#30363D] bg-[#0D1117]/70 px-3.5 py-2 text-[#7D8590]'
      : mine
        ? 'border border-[#1E5631] bg-[#0B2918] px-3.5 py-2 text-[#E6EDF3]'
        : 'border border-[#2D333B] bg-[#161B22] px-3.5 py-2 text-[#E6EDF3]';
  const quoteClass = mine
    ? 'border-l-2 border-[#22C55E] bg-[#051C0F]/90'
    : 'border-l-2 border-[#22C55E] bg-[#0D1117]/90';

  const actionBar = selectionMode || isDeleted ? null : (
    <ChatMessageActions
      message={message}
      mine={mine}
      canDelete={canDelete}
      canWriteChat={canWriteChat}
      menuOpen={menuOpen}
      onMenuOpenChange={onMenuOpenChange}
      onReply={onReply}
      onEdit={onEdit}
      onTogglePin={onTogglePin}
      onStartSelect={onStartSelect}
      onDelete={onDelete}
      onToggleReaction={onToggleReaction}
    />
  );

  return (
    <div
      onClick={selectionMode && !isDeleted ? () => onToggleSelect?.(message.id) : undefined}
      className={`group flex items-start gap-2.5 ${isFirstInGroup ? 'mt-3.5' : 'mt-1.5'} ${
        mine ? 'justify-end' : 'justify-start'
      } ${selectionMode && !isDeleted ? 'cursor-pointer px-1.5 py-1 hover:bg-[#161B22]/60' : ''} ${
        selected && !isDeleted ? 'bg-[#052E16]/40' : ''
      }`}
    >
      {selectionMode && !isDeleted && (
        <button
          type="button"
          aria-label={selected ? 'Deselect message' : 'Select message'}
          aria-pressed={selected}
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(message.id); }}
          className={`mt-1.5 shrink-0 ${selected ? 'text-[#22C55E]' : 'text-[#7D8590] hover:text-[#E6EDF3]'}`}
        >
          {selected ? <CheckSquare className="h-4 w-4" strokeWidth={1.75} /> : <Square className="h-4 w-4" strokeWidth={1.5} />}
        </button>
      )}

      {!mine && (
        <div className="w-7 shrink-0 pt-0.5">
          {isFirstInGroup && <UserAvatar name={message.senderName} avatarUrl={message.senderAvatarUrl} />}
        </div>
      )}

      {mine && actionBar}

      <div className={`flex min-w-0 max-w-[76%] flex-col ${mine ? 'items-end' : 'items-start'} ${reactions.length > 0 ? 'mb-2.5' : ''}`}>
        <div className={`relative w-fit max-w-full ${bubbleClass} ${message.pinned ? 'border-[#22C55E]' : ''}`}>
          {(!mine && isFirstInGroup) || message.pinned ? (
            <div className="mb-1 flex items-center justify-between gap-2">
              {!mine && isFirstInGroup && (
                <span className="text-xs font-semibold leading-tight text-[#4ADE80]">{message.senderName}</span>
              )}
              {message.pinned && (
                <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-[#22C55E]">
                  <Pin className="h-2.5 w-2.5" strokeWidth={1.75} />
                  Pinned
                </span>
              )}
            </div>
          ) : null}

          {hasReply && (
            <div className={`mb-1.5 px-2.5 py-1 text-xs ${quoteClass}`}>
              <div className="flex items-center gap-1 font-semibold text-[#4ADE80]">
                <CornerUpLeft className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{message.replyToSenderName ?? 'Reply'}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-[#8B949E]">
                {message.replyToSnippet || 'Replied message'}
              </p>
            </div>
          )}

          {isDeleted ? (
            <p className="flex items-center gap-1.5 text-xs italic text-[#7D8590]">
              <Ban className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              <span>This message was deleted</span>
            </p>
          ) : (
            <>
              {hasText && (
                <p className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.45] text-[#E6EDF3]">
                  {renderContent(message.content)}
                </p>
              )}
              <ChatMessageAttachment
                attachments={message.attachments}
                attachmentName={message.attachmentName}
                attachmentUrl={message.attachmentUrl}
                mine={mine}
                hasText={hasText}
                onPreviewImage={onPreviewImage}
              />
              <ChatReactionDock
                messageId={message.id}
                mine={mine}
                canWriteChat={canWriteChat}
                reactions={reactions}
                onToggleReaction={onToggleReaction}
              />
            </>
          )}
        </div>

        {(isLastInGroup || message.editedAt) && (
          <div className={`flex items-center gap-1 font-mono text-[10px] text-[#7D8590] ${reactions.length > 0 ? 'mt-3.5' : 'mt-1.5'}`}>
            {mine && showReadReceipt && !isDeleted && <ChatMessageReadReceipt seenByNames={seenByNames} />}
            {isLastInGroup && <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>}
            {message.editedAt && <span className="text-[#7D8590]">(edited)</span>}
          </div>
        )}
      </div>

      {!mine && actionBar}
    </div>
  );
}
