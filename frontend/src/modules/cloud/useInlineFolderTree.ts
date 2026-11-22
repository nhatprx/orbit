import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto, CloudSortBy, CloudSortDir } from '../../types/cloud.types';

export interface FlatTreeRow {
  node: CloudNodeDto;
  indent: number;
}

export function useInlineFolderTree(
  api: CloudFilesApi,
  rootNodes: CloudNodeDto[],
  enabled: boolean,
  sortBy: CloudSortBy,
  sortDir: CloudSortDir,
  resetKey: string
) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [childrenMap, setChildrenMap] = useState<Record<string, CloudNodeDto[]>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpandedIds(new Set());
    setChildrenMap({});
    setLoadingIds(new Set());
  }, [resetKey, enabled, sortBy, sortDir]);

  const toggleExpand = useCallback(
    (folderId: string) => {
      if (!enabled) return;
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(folderId)) {
          next.delete(folderId);
          return next;
        }
        next.add(folderId);
        return next;
      });

      if (childrenMap[folderId]) return;

      setLoadingIds((prev) => new Set(prev).add(folderId));
      api
        .listNodes({ parentId: folderId, view: 'ALL', sortBy, sortDir, limit: 100 })
        .then((page) => {
          setChildrenMap((prev) => ({ ...prev, [folderId]: page.items }));
        })
        .catch(() => {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            next.delete(folderId);
            return next;
          });
        })
        .finally(() => {
          setLoadingIds((prev) => {
            const next = new Set(prev);
            next.delete(folderId);
            return next;
          });
        });
    },
    [api, enabled, sortBy, sortDir, childrenMap]
  );

  const rows = useMemo<FlatTreeRow[]>(() => {
    const out: FlatTreeRow[] = [];
    const append = (items: CloudNodeDto[], indent: number) => {
      for (const item of items) {
        out.push({ node: item, indent });
        if (enabled && item.nodeType === 'FOLDER' && expandedIds.has(item.id)) {
          const kids = childrenMap[item.id];
          if (kids && kids.length > 0) append(kids, indent + 1);
        }
      }
    };
    append(rootNodes, 0);
    return out;
  }, [rootNodes, enabled, expandedIds, childrenMap]);

  return { rows, expandedIds, loadingIds, toggleExpand };
}
