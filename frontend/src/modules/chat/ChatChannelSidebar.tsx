import { Hash, MessageSquare } from 'lucide-react';
import type { ChatChannel } from '../../types/chat.types';

interface ChatChannelSidebarProps {
  channels: ChatChannel[];
  activeId: string;
  onSelect: (channelId: string) => void;
}

export function ChatChannelSidebar({
  channels,
  activeId,
  onSelect,
}: ChatChannelSidebarProps) {
  const rooms = channels.filter((c) => c.kind === 'channel');
  const dms = channels.filter((c) => c.kind === 'dm');

  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22] p-3">
      <div className="mb-5">
        <p className="mb-2 px-2 font-mono text-xs uppercase tracking-wider text-[#8A8A8A]">
          Channels
        </p>
        <nav className="space-y-1">
          {rooms.map((ch) => {
            const selected = ch.id === activeId;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => onSelect(ch.id)}
                className={`flex w-full items-center justify-between border px-2.5 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                    : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Hash className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{ch.name}</span>
                </span>
                {ch.unread > 0 && (
                  <span className="bg-[#22C55E] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0D1117]">
                    {ch.unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        <p className="mb-2 px-2 font-mono text-xs uppercase tracking-wider text-[#8A8A8A]">
          Direct Messages
        </p>
        <nav className="space-y-1">
          {dms.map((dm) => {
            const selected = dm.id === activeId;
            return (
              <button
                key={dm.id}
                type="button"
                onClick={() => onSelect(dm.id)}
                className={`flex w-full items-center justify-between border px-2.5 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                    : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 ${
                      dm.online ? 'bg-[#22C55E]' : 'bg-[#8A8A8A]'
                    }`}
                  />
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{dm.name}</span>
                </span>
                {dm.unread > 0 && (
                  <span className="bg-[#22C55E] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0D1117]">
                    {dm.unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
