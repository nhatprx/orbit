import { useLayoutEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import type { ChatMessageDto } from '../../types/workspace.types';
import { formatTime, initialsOf } from '../../utils/format';

interface ChatMessageListProps {
  messages: ChatMessageDto[];
  currentUserId: string | null;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
}

export function ChatMessageList({ messages, currentUserId, hasOlder, loadingOlder, onLoadOlder }: ChatMessageListProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;

  // Follow the conversation when the newest message changes (not when older pages are prepended).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  return (
    <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite" aria-label="Messages">
      {hasOlder && (
        <div className="text-center">
          <Button type="button" variant="secondary" disabled={loadingOlder} onClick={onLoadOlder}>
            {loadingOlder ? 'Loading...' : 'Load older messages'}
          </Button>
        </div>
      )}
      {messages.length === 0 && (
        <p className="py-12 text-center text-sm text-[#8A8A8A]">No messages yet. Start the conversation below.</p>
      )}
      {messages.map((message) => {
        const mine = message.senderId === currentUserId;
        return (
          <div key={message.id} className="flex items-start gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center border font-mono text-xs font-semibold ${
                mine ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]' : 'border-[#3B434B] bg-[#161B22] text-[#BDBDBD]'
              }`}
            >
              {initialsOf(message.senderName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold text-[#E6EDF3]">{message.senderName}</span>
                <span className="font-mono text-xs text-[#8A8A8A]">@{message.senderUsername}</span>
                <time dateTime={message.createdAt} className="font-mono text-xs text-[#7D8590]">
                  {formatTime(message.createdAt)}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#E6EDF3]">
                {message.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
