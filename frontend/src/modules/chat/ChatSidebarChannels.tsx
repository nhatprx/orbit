import { useMemo, useState, type DragEvent } from 'react';
import type { ChatChannelDto, VoiceParticipantDto } from '../../types/workspace.types';
import { ChatCategoryHeader } from './ChatCategoryHeader';
import { groupChannelsByCategory, resolveCategory } from './chatCategoryGrouping';
import { ChatChannelRow } from './ChatChannelRow';
import type { useChatOrder } from './useChatOrder';

type ChatOrderApi = ReturnType<typeof useChatOrder>;

interface ChatSidebarChannelsProps {
  channels: ChatChannelDto[];
  order: ChatOrderApi;
  selectedChannelId: string | null;
  activeVoiceChannelId: string | null;
  participantsByChannel: Record<string, VoiceParticipantDto[]>;
  canManageChannels: boolean;
  filterQuery: string;
  onSelectChannel: (channel: ChatChannelDto) => void;
  onCreateCategorySubChannel?: (category: string) => void;
  onMoveChannelToCategory?: (channelId: string, nextCategory: string) => Promise<void>;
  onDeleteChannel: (channel: ChatChannelDto) => void;
  onRenameCategory?: (oldCategory: string, nextCategory: string) => Promise<void>;
  onDeleteCategory?: (category: string) => void;
}

export function ChatSidebarChannels({
  channels,
  order,
  selectedChannelId,
  activeVoiceChannelId,
  participantsByChannel,
  canManageChannels,
  filterQuery,
  onSelectChannel,
  onCreateCategorySubChannel,
  onMoveChannelToCategory,
  onDeleteChannel,
  onRenameCategory,
  onDeleteCategory,
}: ChatSidebarChannelsProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [dragOverChannelId, setDragOverChannelId] = useState<string | null>(null);

  const { grouped, childrenByParent } = useMemo(
    () => groupChannelsByCategory(channels, filterQuery, order),
    [channels, filterQuery, order]
  );

  const allCategoryNames = grouped.map(([cat]) => cat);
  const allChannelIds = channels.map((c) => c.id);

  function handleCategoryDragStart(event: DragEvent, category: string) {
    event.dataTransfer.setData('application/x-orbit-category', category);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleChannelDragStart(event: DragEvent, channelId: string) {
    event.stopPropagation();
    event.dataTransfer.setData('application/x-orbit-channel', channelId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleCategoryDrop(event: DragEvent, targetCategory: string) {
    event.preventDefault();
    setDragOverCategory(null);
    const draggedCat = event.dataTransfer.getData('application/x-orbit-category');
    if (draggedCat) {
      order.reorderCategory(allCategoryNames, draggedCat, targetCategory);
      return;
    }
    const draggedChannelId = event.dataTransfer.getData('application/x-orbit-channel');
    if (draggedChannelId && onMoveChannelToCategory) {
      const source = channels.find((c) => c.id === draggedChannelId);
      if (source && resolveCategory(source) !== targetCategory) {
        void onMoveChannelToCategory(draggedChannelId, targetCategory);
      }
    }
  }

  function handleChannelDrop(event: DragEvent, targetChannelId: string, targetCategory: string) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverChannelId(null);
    const draggedChannelId = event.dataTransfer.getData('application/x-orbit-channel');
    if (!draggedChannelId || draggedChannelId === targetChannelId) return;
    order.reorderChannel(allChannelIds, draggedChannelId, targetChannelId);
    const source = channels.find((c) => c.id === draggedChannelId);
    if (source && resolveCategory(source) !== targetCategory && onMoveChannelToCategory) {
      void onMoveChannelToCategory(draggedChannelId, targetCategory);
    }
  }

  if (grouped.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-[#8A8A8A]">
        {filterQuery.trim() ? 'No matching channels.' : 'No channels yet. Click + above to create one.'}
      </p>
    );
  }

  return (
    <div className="space-y-0.5 p-2">
      {grouped.map(([category, items]) => {
        const isCollapsed = Boolean(collapsed[category]);
        return (
          <div key={category} className={isCollapsed ? '' : 'pb-1.5'}>
            <ChatCategoryHeader
              category={category}
              isCollapsed={isCollapsed}
              canManageChannels={canManageChannels}
              isDragOver={dragOverCategory === category}
              onToggle={() => setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }))}
              onAddSubChannel={onCreateCategorySubChannel}
              onRename={onRenameCategory}
              onDelete={onDeleteCategory}
              onDragStart={(e) => handleCategoryDragStart(e, category)}
              onDragOver={(e) => { e.preventDefault(); setDragOverCategory(category); }}
              onDragLeave={() => setDragOverCategory(null)}
              onDrop={(e) => handleCategoryDrop(e, category)}
            />

            {!isCollapsed && (
              <div className="mt-1 space-y-0.5">
                {items.length === 0 ? (
                  <p className="px-3 py-1 text-[11px] italic text-[#6E7681]">No sub-channels yet</p>
                ) : (
                  items.map((channel) => (
                    <ChatChannelRow
                      key={channel.id}
                      channel={channel}
                      category={category}
                      childrenByParent={childrenByParent}
                      selectedChannelId={selectedChannelId}
                      activeVoiceChannelId={activeVoiceChannelId}
                      participantsByChannel={participantsByChannel}
                      collapsedParents={collapsedParents}
                      dragOverChannelId={dragOverChannelId}
                      canManageChannels={canManageChannels}
                      onToggleParent={(id) => setCollapsedParents((prev) => ({ ...prev, [id]: !prev[id] }))}
                      onSelectChannel={onSelectChannel}
                      onDeleteChannel={onDeleteChannel}
                      onChannelDragStart={handleChannelDragStart}
                      onChannelDragOver={(e, id) => { e.preventDefault(); e.stopPropagation(); setDragOverChannelId(id); }}
                      onChannelDragLeave={() => setDragOverChannelId(null)}
                      onChannelDrop={handleChannelDrop}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
