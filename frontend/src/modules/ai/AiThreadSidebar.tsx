import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { AiThread } from '../../types/ai.types';
import { formatDate } from '../../utils/format';

interface AiThreadSidebarProps {
  threads: AiThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

export function AiThreadSidebar({
  threads,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}: AiThreadSidebarProps) {
  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22] p-2.5">
      <Button type="button" variant="primary" onClick={onNewChat} className="mb-3 w-full">
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        New AI Chat
      </Button>

      <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">
        Recent Sessions
      </p>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {threads.length === 0 ? (
          <p className="px-2 py-4 text-xs text-[#7D8590]">No sessions yet.</p>
        ) : (
          threads.map((thread) => {
            const selected = thread.id === activeId;
            return (
              <div
                key={thread.id}
                className={`group flex items-start justify-between border px-2.5 py-2 transition-colors ${
                  selected
                    ? 'border-[#22C55E] bg-[#052E16] text-[#E6EDF3]'
                    : 'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(thread.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <MessageSquare
                      className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-[#22C55E]' : 'text-[#7D8590]'}`}
                      strokeWidth={1.5}
                    />
                    <span className="truncate">{thread.title}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 pl-5 font-mono text-[10px] text-[#7D8590]">
                    <span>{thread.scopeType}</span>
                    <span>-</span>
                    <span>{formatDate(thread.updatedAt)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete session"
                  onClick={() => onDelete(thread.id)}
                  className="ml-1 p-0.5 text-[#7D8590] opacity-0 transition-opacity hover:text-[#EF4444] group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
            );
          })
        )}
      </nav>
    </div>
  );
}
