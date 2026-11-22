import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import type { ChatMessageDto, ChatReactionKey } from '../../types/workspace.types';
import type { PreviewImageItem } from './ChatImageLightbox';
import { groupChatMessages } from './chatMessageGrouping';
import { ChatMessageRow } from './ChatMessageRow';

interface ChatMessageListProps {
  messages: ChatMessageDto[];
  currentUserId: string | null;
  canManageChannels: boolean;
  canWriteChat?: boolean;
  searchQuery?: string;
  hasOlder: boolean;
  loadingOlder: boolean;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (messageId: string) => void;
  onStartSelect?: (messageId: string) => void;
  onLoadOlder: () => void;
  onReply: (message: ChatMessageDto) => void;
  onEdit?: (message: ChatMessageDto) => void;
  onTogglePin?: (messageId: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, key: ChatReactionKey) => Promise<void>;
  onPreviewImage?: (image: PreviewImageItem) => void;
}

export function ChatMessageList(props: ChatMessageListProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const query = props.searchQuery?.trim().toLowerCase() ?? '';
  const messages = useMemo(
    () =>
      query
        ? props.messages.filter((message) =>
            `${message.content} ${message.senderName} ${message.senderUsername} ${message.attachmentName ?? ''}`
              .toLowerCase()
              .includes(query)
          )
        : props.messages,
    [props.messages, query]
  );
  const grouped = useMemo(() => groupChatMessages(messages), [messages]);
  const lastId = messages[messages.length - 1]?.id;

  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [lastId]);

  return (
    <div
      ref={scroller}
      className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
      aria-live="polite"
      aria-label="Messages"
    >
      {props.hasOlder && !query && (
        <div className="mb-3 text-center">
          <Button
            type="button"
            variant="secondary"
            disabled={props.loadingOlder}
            onClick={props.onLoadOlder}
          >
            {props.loadingOlder ? 'Loading...' : 'Load older messages'}
          </Button>
        </div>
      )}

      {grouped.length === 0 && (
        <p className="py-12 text-center text-sm text-[#8A8A8A]">
          {query ? 'No messages match your search.' : 'No messages yet. Start the conversation below.'}
        </p>
      )}

      {grouped.map(({ message, dateLabel, isFirstInGroup, isLastInGroup }) => (
        <div key={message.id}>
          {dateLabel && (
            <div className="my-4 flex items-center gap-3" role="separator" aria-label={dateLabel}>
              <span className="h-px flex-1 bg-[#21262D]" />
              <span className="border border-[#30363D] bg-[#161B22] px-2.5 py-0.5 font-mono text-[11px] text-[#8B949E]">
                {dateLabel}
              </span>
              <span className="h-px flex-1 bg-[#21262D]" />
            </div>
          )}
          <ChatMessageRow
            message={message}
            mine={message.senderId === props.currentUserId}
            canDelete={message.senderId === props.currentUserId || props.canManageChannels}
            canWriteChat={props.canWriteChat !== false}
            isFirstInGroup={isFirstInGroup}
            isLastInGroup={isLastInGroup}
            selectionMode={props.selectionMode}
            selected={props.selectedIds?.has(message.id) ?? false}
            menuOpen={openMenuId === message.id}
            onMenuOpenChange={(open) => setOpenMenuId(open ? message.id : null)}
            onToggleSelect={props.onToggleSelect}
            onStartSelect={props.onStartSelect}
            onReply={props.onReply}
            onEdit={props.onEdit}
            onTogglePin={props.onTogglePin}
            onDelete={props.onDeleteMessage}
            onToggleReaction={props.onToggleReaction}
            onPreviewImage={props.onPreviewImage}
          />
        </div>
      ))}
    </div>
  );
}
