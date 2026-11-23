import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import type { ChatChannelDto, ChatMessageDto, ChatReactionKey, MemberDto } from '../../types/workspace.types';
import { ChatEmptyChannelCard } from './ChatEmptyChannelCard';
import type { PreviewImageItem } from './ChatImageLightbox';
import { groupChatMessages } from './chatMessageGrouping';
import { ChatMessageRow } from './ChatMessageRow';

interface ChatMessageListProps {
  channel?: ChatChannelDto;
  scopeLabel?: string;
  messages: ChatMessageDto[];
  members?: MemberDto[];
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
  const contentRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
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
  const seenByNames = useMemo(
    () => (props.members ?? []).filter((m) => m.userId !== props.currentUserId).map((m) => m.displayName),
    [props.members, props.currentUserId]
  );

  useLayoutEffect(() => {
    if (scroller.current) {
      stickToBottomRef.current = true;
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [lastId]);

  useEffect(() => {
    const el = scroller.current;
    const content = contentRef.current;
    if (!el || !content || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  function handleScroll() {
    const el = scroller.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  return (
    <div
      ref={scroller}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
      aria-live="polite"
      aria-label="Messages"
    >
      <div ref={contentRef}>
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
        query || !props.channel ? (
          <p className="py-12 text-center text-sm text-[#8A8A8A]">
            {query ? 'No messages match your search.' : 'No messages yet. Start the conversation below.'}
          </p>
        ) : (
          <ChatEmptyChannelCard
            channel={props.channel}
            scopeLabel={props.scopeLabel}
            memberCount={props.members?.length || 1}
          />
        )
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
            showReadReceipt={message.id === lastId}
            seenByNames={seenByNames}
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
    </div>
  );
}
