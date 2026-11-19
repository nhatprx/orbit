import { MessageSquare, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { AiThread } from '../../types/ai.types';

interface AiThreadSidebarProps {
  threads: AiThread[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function AiThreadSidebar({
  threads,
  activeId,
  onSelect,
  onNewChat,
}: AiThreadSidebarProps) {
  return (
    <div className="flex w-52 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22] p-2.5">
      <Button
        type="button"
        variant="primary"
        onClick={onNewChat}
        className="mb-3 w-full"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        New AI Chat
      </Button>

      <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">
        Recent Sessions
      </p>

      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {threads.map((thread) => {
          const selected = thread.id === activeId;
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelect(thread.id)}
              className={`flex w-full flex-col border px-2.5 py-1.5 text-left transition-colors ${
                selected
                  ? 'border-[#22C55E] bg-[#052E16] text-[#E6EDF3]'
                  : 'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
              }`}
            >
              <span className="flex items-center gap-2 text-[13px] font-medium">
                <MessageSquare
                  className={`h-3.5 w-3.5 shrink-0 ${
                    selected ? 'text-[#22C55E]' : 'text-[#7D8590]'
                  }`}
                  strokeWidth={1.5}
                />
                <span className="truncate">{thread.title}</span>
              </span>
              <span className="mt-0.5 pl-5 font-mono text-[10px] text-[#7D8590]">
                {thread.updatedAt}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
