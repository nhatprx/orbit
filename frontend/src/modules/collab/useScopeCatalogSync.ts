import { useEffect, useRef } from 'react';
import {
  collabClient,
  type CollabScopeTarget,
  type CollabStompClient,
} from '../../services/collab/collabClient';
import type { CollabCatalogModule, ScopeCatalogEvent } from '../../types/collab.types';

export interface UseScopeCatalogSyncOptions {
  scope: CollabScopeTarget | null;
  module: CollabCatalogModule;
  enabled?: boolean;
  debounceMs?: number;
  client?: CollabStompClient;
  onRefresh: () => void;
  onEvent?: (event: ScopeCatalogEvent) => void;
}

export function useScopeCatalogSync({
  scope,
  module,
  enabled = true,
  debounceMs = 120,
  client = collabClient,
  onRefresh,
  onEvent,
}: UseScopeCatalogSyncOptions): void {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scopeType = scope?.type ?? null;
  const workspaceId = scope?.workspaceId ?? null;
  const projectId = scope?.projectId ?? null;

  useEffect(() => {
    if (!enabled || !scopeType || !workspaceId) return;

    const unsubscribe = client.subscribeScopeCatalog(
      { type: scopeType, workspaceId, projectId },
      (event) => {
        if (event.module !== module) return;
        onEventRef.current?.(event);
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          onRefreshRef.current();
        }, debounceMs);
      }
    );

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      unsubscribe();
    };
  }, [client, debounceMs, enabled, module, projectId, scopeType, workspaceId]);
}
