import { useMemo } from 'react';
import { PanelRight, Tag, User } from 'lucide-react';
import type { ChatChannelDto, ChatMessageDto, MemberDto } from '../../types/workspace.types';
import { ChatChannelIcon } from './ChatChannelIcon';

interface ChatThreadHeaderProps {
  channel: ChatChannelDto;
  scopeLabel: string;
  members: MemberDto[];
  messages: ChatMessageDto[];
  showInfo: boolean;
  onToggleInfo: () => void;
  onOpenInfo: () => void;
}

export function ChatThreadHeader({
  channel,
  scopeLabel,
  members,
  messages,
  showInfo,
  onToggleInfo,
  onOpenInfo,
}: ChatThreadHeaderProps) {
  const avatarByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const msg of messages) {
      if (msg.senderAvatarUrl && !map.has(msg.senderId)) {
        map.set(msg.senderId, msg.senderAvatarUrl);
      }
    }
    return map;
  }, [messages]);

  const memberCount = members.length || 1;
  const mosaicMembers = members.slice(0, 3);
  const tagLabel =
    channel.description?.trim() ||
    (channel.channelType === 'FORUM' ? 'Forum topics' : scopeLabel);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-4 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onOpenInfo}
          aria-label={`Open ${channel.name} info`}
          className={
            channel.avatarUrl
              ? 'h-11 w-11 shrink-0 overflow-hidden border border-[#30363D] bg-[#0D1117] transition-colors hover:border-[#22C55E]'
              : 'grid h-11 w-11 shrink-0 grid-cols-2 gap-[1px] border border-[#30363D] bg-[#0D1117] p-[1px] transition-colors hover:border-[#22C55E]'
          }
        >
          {channel.avatarUrl ? (
            <img src={channel.avatarUrl} alt={channel.name} className="h-full w-full object-cover" />
          ) : (
            <>
              {mosaicMembers.map((member) => {
                const avatarUrl = avatarByUserId.get(member.userId);
                return avatarUrl ? (
                  <img
                    key={member.userId}
                    src={avatarUrl}
                    alt={member.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    key={member.userId}
                    className="flex items-center justify-center bg-[#052E16] font-mono text-[10px] font-semibold text-[#4ADE80]"
                  >
                    {member.displayName.slice(0, 1).toUpperCase()}
                  </span>
                );
              })}
              {Array.from({ length: Math.max(0, 3 - mosaicMembers.length) }).map((_, idx) => (
                <span key={`pad-${idx}`} className="bg-[#161B22]" />
              ))}
              <span className="flex items-center justify-center bg-[#21262D] font-mono text-[10px] font-semibold text-[#E6EDF3]">
                {memberCount}
              </span>
            </>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[15px] font-semibold leading-tight text-[#E6EDF3]">
            <ChatChannelIcon type={channel.channelType} className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
            <span className="truncate">{channel.name}</span>
          </div>

          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[#8B949E]">
            <button
              type="button"
              onClick={onOpenInfo}
              className="inline-flex shrink-0 items-center gap-1 transition-colors hover:text-[#4ADE80]"
            >
              <User className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
            </button>
            <span className="h-3 w-px shrink-0 bg-[#30363D]" aria-hidden="true" />
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate" title={tagLabel}>
              <Tag className="h-3.5 w-3.5 shrink-0 text-[#8B949E]" strokeWidth={1.5} />
              <span className="truncate text-[11px] text-[#8B949E]">{tagLabel}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Toggle channel info"
          aria-pressed={showInfo}
          title="Channel info"
          onClick={onToggleInfo}
          className={`flex h-8 w-8 items-center justify-center border transition-colors ${
            showInfo
              ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
              : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#22C55E] hover:text-[#E6EDF3]'
          }`}
        >
          <PanelRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
