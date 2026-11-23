import { Bot, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import type { AiThread } from '../../types/ai.types';
import type { AuthUser } from '../../types/auth.types';
import { formatDate } from '../../utils/format';

interface AiThreadSidebarProps {
  threads: AiThread[];
  activeId: string | null;
  currentUser: AuthUser | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

export function AiThreadSidebar({
  threads,
  activeId,
  currentUser,
  onSelect,
  onNewChat,
  onDelete,
}: AiThreadSidebarProps) {
  const handle = currentUser?.username ?? currentUser?.email.split('@')[0] ?? 'member';

  return (
    <aside
      aria-label="AI chat sessions sidebar"
      className="flex w-60 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22]"
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#30363D] px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 border border-[#30363D] bg-[#21262D] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#22C55E]">
            AI
          </span>
          <h2 className="truncate text-sm font-semibold text-[#E6EDF3]">Orbit AI</h2>
        </div>

        <button
          type="button"
          aria-label="New AI Chat"
          title="New AI Chat"
          onClick={onNewChat}
          className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8B949E] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      <nav aria-label="AI Sessions" className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <p className="mb-1.5 px-1.5 font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">
          Sessions
        </p>

        {threads.length === 0 ? (
          <div className="border border-dashed border-[#30363D] px-2.5 py-4 text-center">
            <Bot className="mx-auto mb-1.5 h-4 w-4 text-[#7D8590]" strokeWidth={1.5} />
            <p className="text-xs text-[#7D8590]">No sessions yet.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {threads.map((thread) => {
              const selected = thread.id === activeId;
              return (
                <div
                  key={thread.id}
                  className={`group flex items-center justify-between border px-2.5 py-1.5 transition-colors ${
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
                    <span className="flex items-center gap-2 text-[13px] font-medium">
                      <MessageSquare
                        className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-[#22C55E]' : 'text-[#7D8590]'}`}
                        strokeWidth={1.5}
                      />
                      <span className="truncate">{thread.title}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 pl-5.5 font-mono text-[10px] text-[#7D8590]">
                      <span>{thread.scopeType}</span>
                      <span>·</span>
                      <span>{formatDate(thread.updatedAt)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete session"
                    onClick={() => onDelete(thread.id)}
                    className="ml-1 shrink-0 p-1 text-[#7D8590] opacity-0 transition-opacity hover:text-[#EF4444] group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      <div className="flex items-center gap-2 border-t border-[#30363D] bg-[#0D1117] px-3 py-2.5">
        <UserAvatar
          name={currentUser?.name ?? 'Orbit User'}
          avatarUrl={currentUser?.avatarUrl}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[#E6EDF3]">{currentUser?.name ?? 'Member'}</p>
          <p className="truncate font-mono text-[11px] text-[#8A8A8A]">@{handle}</p>
        </div>
      </div>
    </aside>
  );
}
