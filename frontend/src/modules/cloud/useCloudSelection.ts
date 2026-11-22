import { useCallback, useState } from 'react';

export interface SelectOptions {
  multi?: boolean;
  range?: boolean;
}

export interface CloudSelectionState {
  selectedIds: string[];
  selectedId: string | null;
  selectNode: (nodeId: string, orderedIds: string[], opts?: SelectOptions) => void;
  selectOnly: (nodeId: string) => void;
  clearSelection: () => void;
  pruneSelection: (validIds: ReadonlySet<string>) => void;
}

export function useCloudSelection(): CloudSelectionState {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [anchorId, setAnchorId] = useState<string | null>(null);

  const selectNode = useCallback(
    (nodeId: string, orderedIds: string[], opts: SelectOptions = {}) => {
      if (opts.range && anchorId) {
        const start = orderedIds.indexOf(anchorId);
        const end = orderedIds.indexOf(nodeId);
        if (start !== -1 && end !== -1) {
          const [lo, hi] = start <= end ? [start, end] : [end, start];
          setSelectedIds(orderedIds.slice(lo, hi + 1));
          return;
        }
      }
      if (opts.multi) {
        setSelectedIds((prev) =>
          prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
        );
        setAnchorId(nodeId);
        return;
      }
      setSelectedIds([nodeId]);
      setAnchorId(nodeId);
    },
    [anchorId]
  );

  const selectOnly = useCallback((nodeId: string) => {
    setSelectedIds([nodeId]);
    setAnchorId(nodeId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setAnchorId(null);
  }, []);

  const pruneSelection = useCallback((validIds: ReadonlySet<string>) => {
    setSelectedIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, []);

  const selectedId = selectedIds.length === 1 ? (selectedIds[0] ?? null) : null;

  return { selectedIds, selectedId, selectNode, selectOnly, clearSelection, pruneSelection };
}
