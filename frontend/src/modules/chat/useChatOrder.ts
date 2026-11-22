import { useCallback, useEffect, useState } from 'react';
import type { ChatChannelDto } from '../../types/workspace.types';

interface StoredOrder {
  categories: string[];
  channels: string[];
  customCategories: string[];
}

function readOrder(key: string): StoredOrder {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { categories: [], channels: [], customCategories: [] };
    const parsed = JSON.parse(raw) as Partial<StoredOrder>;
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      channels: Array.isArray(parsed.channels) ? parsed.channels : [],
      customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
    };
  } catch {
    return { categories: [], channels: [], customCategories: [] };
  }
}

function moveItem(list: string[], from: string, to: string): string[] {
  const next = list.filter((item) => item !== from);
  const targetIdx = next.indexOf(to);
  if (targetIdx === -1) return [...next, from];
  next.splice(targetIdx, 0, from);
  return next;
}

export function useChatOrder(scopeKey: string) {
  const storageKey = `orbit_chat_order:${scopeKey}`;
  const [order, setOrder] = useState<StoredOrder>(() => readOrder(storageKey));

  useEffect(() => {
    setOrder(readOrder(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (updater: (prev: StoredOrder) => StoredOrder) => {
      setOrder((prev) => {
        const next = updater(prev);
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    },
    [storageKey]
  );

  const addCustomCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => ({
      ...prev,
      customCategories: prev.customCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())
        ? prev.customCategories
        : [...prev.customCategories, trimmed],
    }));
  }, [persist]);

  const renameCustomCategory = useCallback((oldName: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    persist((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c === oldName ? trimmed : c)),
      customCategories: prev.customCategories.map((c) => (c === oldName ? trimmed : c)),
    }));
  }, [persist]);

  const removeCustomCategory = useCallback((name: string) => {
    persist((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== name),
      customCategories: prev.customCategories.filter((c) => c !== name),
    }));
  }, [persist]);

  const reorderCategory = useCallback(
    (allCategories: string[], fromCat: string, toCat: string) => {
      if (fromCat === toCat) return;
      persist((prev) => {
        const base = [...new Set([...prev.categories.filter((c) => allCategories.includes(c)), ...allCategories])];
        return { ...prev, categories: moveItem(base, fromCat, toCat) };
      });
    },
    [persist]
  );

  const reorderChannel = useCallback(
    (allIds: string[], fromId: string, toId: string) => {
      if (fromId === toId) return;
      persist((prev) => {
        const base = [...new Set([...prev.channels.filter((id) => allIds.includes(id)), ...allIds])];
        return { ...prev, channels: moveItem(base, fromId, toId) };
      });
    },
    [persist]
  );

  const sortCategories = useCallback(
    (entries: Array<[string, ChatChannelDto[]]>, fallbackCompare: (a: string, b: string) => number) => {
      return [...entries].sort(([a], [b]) => {
        const idxA = order.categories.indexOf(a);
        const idxB = order.categories.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return fallbackCompare(a, b);
      });
    },
    [order.categories]
  );

  const sortChannels = useCallback(
    (items: ChatChannelDto[]) => {
      return [...items].sort((a, b) => {
        const idxA = order.channels.indexOf(a.id);
        const idxB = order.channels.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    },
    [order.channels]
  );

  return {
    customCategories: order.customCategories,
    addCustomCategory,
    renameCustomCategory,
    removeCustomCategory,
    sortCategories,
    sortChannels,
    reorderCategory,
    reorderChannel,
  };
}
