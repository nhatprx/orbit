import { useLayoutEffect, useMemo, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import type { ChatMessageDto, ChatReactionKey } from '../../types/workspace.types';
import { ChatMessageRow } from './ChatMessageRow';

interface ChatMessageListProps {
  messages: ChatMessageDto[];
  currentUserId: string | null;
  canManageChannels: boolean;
  canWriteChat?: boolean;
  searchQuery?: string;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onReply: (message: ChatMessageDto) => void;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, key: ChatReactionKey) => Promise<void>;
}

export function ChatMessageList(props: ChatMessageListProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const query = props.searchQuery?.trim().toLowerCase() ?? '';
  const messages = useMemo(() => query ? props.messages.filter((message) =>
    `${message.content} ${message.senderName} ${message.senderUsername} ${message.attachmentName ?? ''}`
      .toLowerCase().includes(query)) : props.messages, [props.messages, query]);
  const lastId = messages[messages.length - 1]?.id;

  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [lastId]);

  return (
    <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite" aria-label="Messages">
      {props.hasOlder && !query && <div className="text-center"><Button type="button" variant="secondary" disabled={props.loadingOlder} onClick={props.onLoadOlder}>{props.loadingOlder ? 'Loading...' : 'Load older messages'}</Button></div>}
      {messages.length === 0 && <p className="py-12 text-center text-sm text-[#8A8A8A]">{query ? 'No messages match your search.' : 'No messages yet. Start the conversation below.'}</p>}
      {messages.map((message) => <ChatMessageRow key={message.id} message={message}
        mine={message.senderId === props.currentUserId} canDelete={message.senderId === props.currentUserId || props.canManageChannels}
        canWriteChat={props.canWriteChat !== false} onReply={props.onReply}
        onDelete={props.onDeleteMessage} onToggleReaction={props.onToggleReaction} />)}
    </div>
  );
}
