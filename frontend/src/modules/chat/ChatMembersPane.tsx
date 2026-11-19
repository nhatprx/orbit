import { Badge } from '../../components/ui/Badge';
import type { ChatMember } from '../../types/chat.types';

interface ChatMembersPaneProps {
  members: ChatMember[];
}

const STATUS_COLOR: Record<ChatMember['status'], string> = {
  online: 'bg-[#22C55E]',
  away: 'bg-[#EAB308]',
  offline: 'bg-[#8A8A8A]',
};

export function ChatMembersPane({ members }: ChatMembersPaneProps) {
  const onlineCount = members.filter((m) => m.status !== 'offline').length;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-l border-[#30363D] bg-[#161B22] p-4 xl:flex">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-[#8A8A8A]">
          Team Members
        </span>
        <span className="font-mono text-xs text-[#22C55E]">
          {onlineCount}/{members.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between border border-[#30363D] bg-[#0D1117] px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={`h-1.5 w-1.5 shrink-0 ${STATUS_COLOR[member.status]}`} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#E6EDF3]">
                  {member.name}
                </p>
                <p className="truncate font-mono text-xs text-[#8A8A8A]">
                  @{member.handle}
                </p>
              </div>
            </div>
            {member.role === 'admin' && <Badge tone="green">admin</Badge>}
          </div>
        ))}
      </div>
    </aside>
  );
}
