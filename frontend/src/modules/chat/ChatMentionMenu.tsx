import { Bot, Users } from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import type { MemberDto } from '../../types/workspace.types';

export interface ActiveMention {
  start: number;
  query: string;
}

export interface MentionCandidate {
  id: string;
  handle: string;
  label: string;
  subtitle: string;
  avatarUrl?: string | null;
  isAll?: boolean;
  isAi?: boolean;
}

export function findActiveMention(text: string, cursor: number): ActiveMention | null {
  const before = text.slice(0, cursor);
  const atIndex = before.lastIndexOf('@');
  if (atIndex < 0) return null;
  if (atIndex > 0 && !/\s/.test(before[atIndex - 1] ?? '')) return null;
  const query = before.slice(atIndex + 1);
  if (/\s/.test(query)) return null;
  return { start: atIndex, query };
}

export function applyMention(
  text: string,
  start: number,
  cursor: number,
  handle: string
): { next: string; nextCursor: number } {
  const inserted = `@${handle} `;
  const next = text.slice(0, start) + inserted + text.slice(cursor);
  return { next, nextCursor: start + inserted.length };
}

export function filterMentionCandidates(members: MemberDto[], query: string): MentionCandidate[] {
  const q = query.trim().toLowerCase();
  const list: MentionCandidate[] = [];

  if (!q || 'all'.startsWith(q) || 'everyone'.startsWith(q)) {
    list.push({
      id: 'mention-all',
      handle: 'all',
      label: '@all',
      subtitle: 'Notify everyone in this channel',
      isAll: true,
    });
  }

  if (!q || 'ai'.startsWith(q) || 'orbit'.startsWith(q) || 'bot'.startsWith(q)) {
    list.push({
      id: 'mention-ai',
      handle: 'ai',
      label: '@ai',
      subtitle: 'Ask Orbit AI about this chat',
      isAi: true,
    });
  }

  for (const member of members) {
    if (list.length >= 8) break;
    const match =
      !q ||
      member.username.toLowerCase().includes(q) ||
      member.displayName.toLowerCase().includes(q);
    if (match) {
      list.push({
        id: member.userId,
        handle: member.username,
        label: member.displayName,
        subtitle: `@${member.username}`,
      });
    }
  }
  return list;
}

interface ChatMentionMenuProps {
  candidates: MentionCandidate[];
  selectedIndex: number;
  onSelect: (candidate: MentionCandidate) => void;
}

export function ChatMentionMenu({ candidates, selectedIndex, onSelect }: ChatMentionMenuProps) {
  if (candidates.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Mention suggestions"
      className="absolute bottom-full left-0 z-20 mb-1.5 w-full max-w-xs border border-[#30363D] bg-[#0D1117] py-1 shadow-lg"
    >
      <div className="border-b border-[#21262D] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#7D8590]">
        Mention @ai, member, or @all
      </div>
      {candidates.map((item, idx) => {
        const active = idx === selectedIndex;
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={active}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
            className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-xs transition-colors ${
              active
                ? 'border-l-2 border-[#22C55E] bg-[#052E16] text-[#E6EDF3]'
                : 'border-l-2 border-transparent text-[#BDBDBD] hover:bg-[#161B22]'
            }`}
          >
            {item.isAi ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] text-[#4ADE80]">
                <Bot className="h-3.5 w-3.5" strokeWidth={1.5} />
              </span>
            ) : item.isAll ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] text-[#22C55E]">
                <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
              </span>
            ) : (
              <UserAvatar name={item.label} avatarUrl={item.avatarUrl} />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-[#E6EDF3]">{item.label}</span>
              <span className="block truncate font-mono text-[10px] text-[#7D8590]">
                {item.subtitle}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
