import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { ChatChannelDto, VoiceParticipantDto } from '../../types/workspace.types';
import { ChatCategoryHeader } from './ChatCategoryHeader';
import { VoiceChannelUsers } from './VoiceChannelUsers';
import { ChatChannelIcon } from './ChatChannelIcon';

interface ChatSidebarChannelsProps {
  channels: ChatChannelDto[];
  selectedChannelId: string | null;
  activeVoiceChannelId: string | null;
  participantsByChannel: Record<string, VoiceParticipantDto[]>;
  canManageChannels: boolean;
  filterQuery: string;
  onSelectChannel: (channel: ChatChannelDto) => void;
  onEditChannel: (channel: ChatChannelDto) => void;
  onDeleteChannel: (channel: ChatChannelDto) => void;
  onRenameCategory?: (oldCategory: string, nextCategory: string) => Promise<void>;
}

const DEFAULT_ORDER = ['TEXT CHANNELS', 'VOICE CHANNELS', 'FORUMS'];

function resolveCategory(channel: ChatChannelDto): string {
  const trimmed = channel.category?.trim();
  if (trimmed) return trimmed;
  return channel.channelType === 'VOICE' ? 'VOICE CHANNELS' : channel.channelType === 'FORUM' ? 'FORUMS' : 'TEXT CHANNELS';
}

function compareCategories(a: string, b: string): number {
  const idxA = DEFAULT_ORDER.indexOf(a.toUpperCase());
  const idxB = DEFAULT_ORDER.indexOf(b.toUpperCase());
  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;
  return a.localeCompare(b);
}

export function ChatSidebarChannels({
  channels,
  selectedChannelId,
  activeVoiceChannelId,
  participantsByChannel,
  canManageChannels,
  filterQuery,
  onSelectChannel,
  onDeleteChannel,
  onRenameCategory,
}: ChatSidebarChannelsProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    const filtered = query
      ? channels.filter((c) =>
          `${c.name} ${c.category ?? ''} ${c.description ?? ''}`.toLowerCase().includes(query)
        )
      : channels;

    const map = new Map<string, ChatChannelDto[]>();
    for (const channel of filtered) {
      const cat = resolveCategory(channel);
      const list = map.get(cat) ?? [];
      list.push(channel);
      map.set(cat, list);
    }
    return [...map.entries()].sort(([a], [b]) => compareCategories(a, b));
  }, [channels, filterQuery]);

  if (grouped.length === 0) {
    return <p className="px-3 py-6 text-center text-xs text-[#8A8A8A]">No matching channels.</p>;
  }

  return (
    <div className="space-y-3 p-2">
      {grouped.map(([category, items]) => {
        const isCollapsed = Boolean(collapsed[category]);
        return (
          <div key={category}>
            <ChatCategoryHeader
              category={category}
              isCollapsed={isCollapsed}
              canManageChannels={canManageChannels}
              onToggle={() => setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }))}
              onRename={onRenameCategory}
            />

            {!isCollapsed && (
              <div className="mt-1 space-y-0.5">
                {items.map((channel) => {
                  const isSelected = channel.id === selectedChannelId;
                  const isVoice = channel.channelType === 'VOICE';
                  const isForum = channel.channelType === 'FORUM';
                  const isActiveVoice = channel.id === activeVoiceChannelId;
                  const participants = isVoice ? (participantsByChannel[channel.id] ?? []) : [];
                  const isDefaultGeneral = channel.channelType === 'TEXT' && channel.name.toLowerCase() === 'general';

                  return (
                    <div key={channel.id}>
                      <div
                        className={`group flex items-center gap-1 border px-2 py-1.5 text-sm transition-colors ${
                          isSelected
                            ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                            : isActiveVoice
                              ? 'border-[#22C55E] bg-[#21262D] text-[#E6EDF3]'
                              : 'border-transparent text-[#BDBDBD] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectChannel(channel)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <ChatChannelIcon type={channel.channelType} className={`h-3.5 w-3.5 shrink-0 ${isSelected || isActiveVoice ? 'text-[#22C55E]' : 'text-[#8A8A8A]'}`} />
                          <span className="truncate text-[13px] font-medium">{channel.name}</span>
                          {isForum && <span className="shrink-0 font-mono text-[9px] text-[#7D8590]">FORUM</span>}
                        </button>

                        {isVoice && participants.length > 0 && (
                          <span className="shrink-0 border border-[#22C55E] bg-[#052E16] px-1 py-0.5 font-mono text-[10px] font-semibold text-[#4ADE80]">
                            {participants.length} LIVE
                          </span>
                        )}

                        {canManageChannels && !isDefaultGeneral && (
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                            <button
                              type="button"
                              aria-label={`Delete ${channel.name}`}
                              title={`Delete ${channel.name}`}
                              onClick={() => onDeleteChannel(channel)}
                              className="p-0.5 text-[#8A8A8A] hover:text-[#EF4444]"
                            >
                              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                      </div>

                      {isVoice && <VoiceChannelUsers participants={participants} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
