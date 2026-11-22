import type { ChatChannelDto } from '../../types/workspace.types';
import type { useChatOrder } from './useChatOrder';

type ChatOrderApi = ReturnType<typeof useChatOrder>;

const DEFAULT_ORDER = ['TEXT CHANNELS', 'VOICE CHANNELS', 'FORUMS'];

export function resolveCategory(channel: ChatChannelDto): string {
  const trimmed = channel.category?.trim();
  if (trimmed) return trimmed;
  if (channel.channelType === 'VOICE') return 'VOICE CHANNELS';
  if (channel.channelType === 'FORUM') return 'FORUMS';
  return 'TEXT CHANNELS';
}

export function compareCategories(a: string, b: string): number {
  const idxA = DEFAULT_ORDER.indexOf(a.toUpperCase());
  const idxB = DEFAULT_ORDER.indexOf(b.toUpperCase());
  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;
  return a.localeCompare(b);
}

export function groupChannelsByCategory(
  channels: ChatChannelDto[],
  filterQuery: string,
  order: ChatOrderApi
): { grouped: [string, ChatChannelDto[]][]; childrenByParent: Map<string, ChatChannelDto[]> } {
  const query = filterQuery.trim().toLowerCase();
  const filtered = query
    ? channels.filter((c) => `${c.name} ${c.category ?? ''} ${c.description ?? ''}`.toLowerCase().includes(query))
    : channels;

  const visibleIds = new Set(filtered.map((c) => c.id));
  const childMap = new Map<string, ChatChannelDto[]>();
  const roots: ChatChannelDto[] = [];

  for (const channel of filtered) {
    if (channel.parentChannelId && visibleIds.has(channel.parentChannelId)) {
      const list = childMap.get(channel.parentChannelId) ?? [];
      list.push(channel);
      childMap.set(channel.parentChannelId, list);
    } else {
      roots.push(channel);
    }
  }
  childMap.forEach((list, parentId) => childMap.set(parentId, order.sortChannels(list)));

  const catMap = new Map<string, ChatChannelDto[]>();
  for (const customCat of order.customCategories) {
    if (!query || customCat.toLowerCase().includes(query)) {
      catMap.set(customCat, []);
    }
  }
  for (const channel of roots) {
    const cat = resolveCategory(channel);
    const list = catMap.get(cat) ?? [];
    list.push(channel);
    catMap.set(cat, list);
  }
  const grouped = order.sortCategories(
    [...catMap.entries()].map(([cat, items]) => [cat, order.sortChannels(items)] as [string, ChatChannelDto[]]),
    compareCategories
  );
  return { grouped, childrenByParent: childMap };
}
