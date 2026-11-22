import { ThumbsUp } from 'lucide-react';
import type { ChatReactionKey, ChatReactionSummaryDto } from '../../types/workspace.types';

interface ChatReactionDockProps {
  messageId: string;
  mine: boolean;
  canWriteChat: boolean;
  reactions: ChatReactionSummaryDto[];
  onToggleReaction: (messageId: string, key: ChatReactionKey) => Promise<void>;
}

export function ChatReactionDock({
  messageId,
  mine,
  canWriteChat,
  reactions,
  onToggleReaction,
}: ChatReactionDockProps) {
  const like = reactions.find((r) => r.reactionKey === 'LIKE' && r.count > 0);
  if (!like) return null;

  return (
    <div
      className={`absolute -bottom-2.5 z-10 flex items-center gap-1 ${
        mine ? 'left-2' : 'right-2'
      }`}
    >
      <button
        type="button"
        disabled={!canWriteChat}
        aria-pressed={like.reactedByMe}
        onClick={() => void onToggleReaction(messageId, 'LIKE')}
        className={`inline-flex h-5 items-center gap-1 border px-1.5 font-mono text-[10px] leading-none transition-colors ${
          like.reactedByMe
            ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
            : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#484F58] hover:text-[#E6EDF3]'
        } disabled:cursor-not-allowed`}
      >
        <ThumbsUp className="h-2.5 w-2.5" strokeWidth={1.75} />
        <span>{like.count}</span>
      </button>
    </div>
  );
}
