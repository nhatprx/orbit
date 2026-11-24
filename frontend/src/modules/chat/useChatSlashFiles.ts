import { useEffect, useMemo, useState, type KeyboardEvent, type RefObject } from 'react';
import { createHttpCloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto, CloudScope } from '../../types/cloud.types';
import {
  findActiveSlash,
  stripSlashToken,
  type AttachedWorkspaceFile,
} from './ChatSlashFileMenu';

const MAX_ATTACHED_FILES = 10;

export function useChatSlashFiles(
  draft: string,
  setDraft: (value: string) => void,
  cursor: number,
  setCursor: (pos: number) => void,
  workspaceId: string | undefined,
  projectId: string | null | undefined,
  disabled: boolean,
  inputRef: RefObject<HTMLInputElement | null>,
  onError: (msg: string | null) => void
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [files, setFiles] = useState<CloudNodeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedWorkspaceFile[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const cloudScope = useMemo<CloudScope | null>(() => {
    if (!workspaceId) return null;
    if (projectId) return { type: 'PROJECT', workspaceId, projectId, permissions: [] };
    return { type: 'WORKSPACE', workspaceId, permissions: [] };
  }, [workspaceId, projectId]);

  const activeSlash = useMemo(
    () => (disabled || !cloudScope ? null : findActiveSlash(draft, cursor)),
    [disabled, cloudScope, draft, cursor]
  );
  const open = Boolean(activeSlash && !dismissed);

  useEffect(() => {
    setDismissed(false);
    setSelectedIndex(0);
  }, [activeSlash?.start, activeSlash?.query]);

  useEffect(() => {
    if (!open || !cloudScope || !activeSlash) return;
    const controller = new AbortController();
    const api = createHttpCloudFilesApi(cloudScope);
    const q = activeSlash.query.trim();
    setLoading(true);
    const timer = window.setTimeout(() => {
      api
        .listNodes({ view: q ? 'ALL' : 'RECENTS', q: q || undefined, limit: 15 }, controller.signal)
        .then((res) => {
          const onlyFiles = res.items.filter((n) => n.nodeType === 'FILE' && !n.deletedAt);
          setFiles(onlyFiles.slice(0, 10));
        })
        .catch(() => {
          if (!controller.signal.aborted) setFiles([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 120);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, cloudScope, activeSlash]);

  async function selectFile(node: CloudNodeDto) {
    if (!cloudScope || !activeSlash || attachingId) return;
    if (attachedFiles.length >= MAX_ATTACHED_FILES) {
      onError(`You can attach up to ${MAX_ATTACHED_FILES} files per message.`);
      return;
    }
    setAttachingId(node.id);
    onError(null);
    try {
      const api = createHttpCloudFilesApi(cloudScope);
      const res = await api.getDownloadUrl(node.id);
      setAttachedFiles((prev) =>
        prev.some((f) => f.id === node.id) ? prev : [...prev, { id: node.id, name: node.name, url: res.url }]
      );
      const { next, nextCursor } = stripSlashToken(draft, activeSlash.start, cursor);
      setDraft(next);
      setCursor(nextCursor);
      setSelectedIndex(0);
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(nextCursor, nextCursor);
      });
    } catch {
      onError(`Could not attach workspace file "${node.name}".`);
    } finally {
      setAttachingId(null);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): boolean {
    if (!open) return false;
    if (event.key === 'Escape') {
      event.preventDefault();
      setDismissed(true);
      return true;
    }
    if (files.length === 0) return false;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((i) => (i + 1) % files.length);
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((i) => (i - 1 + files.length) % files.length);
      return true;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const target = files[selectedIndex] ?? files[0];
      if (target) void selectFile(target);
      return true;
    }
    return false;
  }

  return {
    open,
    loading,
    attachingId,
    files,
    selectedIndex,
    attachedFiles,
    selectFile,
    removeAttachedFile: (id: string) => setAttachedFiles((prev) => prev.filter((f) => f.id !== id)),
    clearAttachedFiles: () => setAttachedFiles([]),
    handleKeyDown,
  };
}
