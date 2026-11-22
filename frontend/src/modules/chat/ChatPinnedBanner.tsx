import { useState } from 'react';
import { ChevronRight, Pin, PinOff } from 'lucide-react';
import type { ChatMessageDto } from '../../types/workspace.types';

interface ChatPinnedBannerProps {
  pinnedMessages: ChatMessageDto[];
  canWriteChat: boolean;
  onUnpin: (messageId: string) => Promise<void>;
}

export function ChatPinnedBanner({ pinnedMessages, canWriteChat, onUnpin }: ChatPinnedBannerProps) {
  const [index, setIndex] = useState(0);
  if (pinnedMessages.length === 0) return null;

  const safeIndex = index % pinnedMessages.length;
  const current = pinnedMessages[safeIndex];
  if (!current) return null;

  const snippet = current.content.trim() || current.attachmentName || 'Image';

  return (
    <div
      role="region"
      aria-label="Pinned messages"
      className="flex items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-5 py-2 text-xs"
    >
      <button
        type="button"
        onClick={() => setIndex((prev) => (prev + 1) % pinnedMessages.length)}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        title={pinnedMessages.length > 1 ? 'Cycle pinned messages' : 'Pinned message'}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-[#1E5631] bg-[#052E16] text-[#22C55E]">
          <Pin className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-semibold text-[#4ADE80]">
            <span>Pinned Message</span>
            {pinnedMessages.length > 1 && (
              <span className="font-mono text-[10px] text-[#7D8590]">
                {safeIndex + 1}/{pinnedMessages.length}
              </span>
            )}
          </span>
          <span className="block truncate text-[#BDBDBD]">
            <span className="font-medium text-[#E6EDF3]">{current.senderName}:</span> {snippet}
          </span>
        </span>
        {pinnedMessages.length > 1 && (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#7D8590]" strokeWidth={1.5} />
        )}
      </button>

      {canWriteChat && (
        <button
          type="button"
          title="Unpin message"
          aria-label="Unpin message"
          onClick={() => void onUnpin(current.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#22C55E] hover:text-[#E6EDF3]"
        >
          <PinOff className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
